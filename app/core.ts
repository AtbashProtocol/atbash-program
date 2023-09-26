import { AnchorProvider, BN, Program, web3 } from '@coral-xyz/anchor'
import * as ed from '@noble/ed25519'
import axios from 'axios'

import { AtbashProgram, IDL } from '../target/types/atbash_program'
import { ProposalData } from './types'
import { BGSG, findReceipt, isAddress } from './utils'
import { DEFAULT_PROGRAM_ID, DEFAULT_RPC_ENDPOINT, PUB_KEY } from './constant'
import { Leaf, MerkleDistributor } from './merkleDistributor'

const PROGRAMS = {
  rent: web3.SYSVAR_RENT_PUBKEY,
  systemProgram: web3.SystemProgram.programId,
}

class Atbash {
  private _provider: AnchorProvider
  private _pubkey = ed.Point.fromHex(PUB_KEY)

  readonly program: Program<AtbashProgram>
  constructor(
    provider: AnchorProvider,
    programId: string = DEFAULT_PROGRAM_ID,
  ) {
    if (!isAddress(programId)) throw new Error('Invalid program id')
    // Private
    this._provider = provider
    // Public
    this.program = new Program<AtbashProgram>(IDL, programId, this._provider)
  }

  decrypt = async (C: ed.Point, R: ed.Point) => {
    const { data } = await axios.post(
      'https://atbash-system.onrender.com/ec/decrypt',
      {
        message: C.toHex(),
        r: R.toHex(),
      },
    )
    return data.message
  }

  randomNumber = () => {
    const min = 1
    const max = 1_000
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  getMerkleDistributor = (voters: web3.PublicKey[]) => {
    const treeData = voters.map((authority, i) => ({
      authority,
      salt: MerkleDistributor.salt(i.toString()),
    }))
    const merkleDistributor = new MerkleDistributor(treeData)
    return merkleDistributor
  }

  deriveReceiptAddress = async (salt: Buffer, proposalAddress: string) => {
    if (salt.length !== 32) throw new Error('The salt must has length 32')
    if (!isAddress(proposalAddress))
      throw new Error('Invalid distributor address')

    const receiptPublicKey = await findReceipt(
      salt,
      new web3.PublicKey(proposalAddress),
      this._provider.wallet.publicKey,
      this.program.programId,
    )
    const receiptAddress = receiptPublicKey.toBase58()
    return receiptAddress
  }

  getProposalData = (proposalAddress: string): Promise<ProposalData> => {
    return this.program.account.proposal.fetch(proposalAddress)
  }

  initializeProposal = async ({
    candidates,
    voters,
    metadata,
    startTime,
    endTime,
  }: {
    candidates: web3.PublicKey[]
    voters: web3.PublicKey[]
    metadata: Buffer | Uint8Array | number[]
    startTime: number
    endTime: number
  }) => {
    const proposal = web3.Keypair.generate()
    const randomsNumber: BN[] = []
    const ballotBoxes = candidates.map(() => {
      const r = this.randomNumber()
      randomsNumber.push(new BN(r))
      const M = ed.Point.ZERO
      return M.add(this._pubkey.multiply(r)).toRawBytes() // C = M + rG
    })
    const merkleDistributor = this.getMerkleDistributor(voters)
    const merkleRoot = merkleDistributor.deriveMerkleRoot()

    const tx = await this.program.methods
      .initializeProposal(
        metadata as any,
        candidates,
        new BN(startTime),
        new BN(endTime),
        ballotBoxes as any,
        randomsNumber as any,
        [...merkleRoot],
      )
      .accounts({
        authority: this._provider.publicKey,
        proposal: proposal.publicKey,
        ...PROGRAMS,
      })
      .transaction()
    const txId = await this._provider.sendAndConfirm(tx, [proposal])

    return { txId, proposalAddress: proposal.publicKey, tx }
  }

  vote = async ({
    proposalAddress,
    proof,
    data,
    votFor,
  }: {
    proposalAddress: string
    proof: Array<Buffer>
    data: Leaf
    votFor: web3.PublicKey
  }) => {
    if (!isAddress(proposalAddress))
      throw new Error('Invalid distributor address')
    if (!this._provider.wallet.publicKey.equals(data.authority))
      throw new Error('Invalid authority address')
    const { candidates } = await this.getProposalData(proposalAddress)
    const receiptAddress = await this.deriveReceiptAddress(
      data.salt,
      proposalAddress,
    )

    const P = ed.Point.BASE
    const randomsNumber: BN[] = []

    const votes = candidates.map((candidate) => {
      const r = this.randomNumber()
      randomsNumber.push(new BN(r))
      const M = candidate.equals(votFor) ? P : ed.Point.ZERO
      return M.add(this._pubkey.multiply(r)).toRawBytes() // C = M + rG
    })

    const tx = await this.program.methods
      .vote(votes as any, randomsNumber as any, data.salt as any, proof as any)
      .accounts({
        authority: this._provider.publicKey,
        proposal: proposalAddress,
        receipt: receiptAddress,
        ...PROGRAMS,
      })
      .transaction()
    const txId = await this._provider.sendAndConfirm(tx)

    return { txId, tx }
  }

  getResult = async ({ proposalAddress }: { proposalAddress: string }) => {
    const { startDate, endDate, ballotBoxes, randomNumbers, candidates } =
      await this.getProposalData(proposalAddress)
    const now = Date.now()
    if (startDate.toNumber() * 1000 > now)
      throw new Error('Proposal not started!')
    if (endDate.toNumber() * 1000 > now) throw new Error('Proposal not ended!')
    const P = ed.Point.BASE

    const decryptedPoints = await Promise.all(
      ballotBoxes.map(async (ballot, i) => {
        const C = ed.Point.fromHex(new Uint8Array(ballot))
        const R = P.multiply(randomNumbers[i].toNumber())
        const M = await this.decrypt(C, R) //M = C - R * x
        return ed.Point.fromHex(M)
      }),
    )
    const result: number[] = await BGSG(decryptedPoints)
    return result
  }
}

export default Atbash
