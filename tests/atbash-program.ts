import {
  Program,
  AnchorProvider,
  setProvider,
  workspace,
  web3,
  BN,
} from '@coral-xyz/anchor'
import { AtbashProgram } from '../target/types/atbash_program'
import {
  ASSOCIATED_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@coral-xyz/anchor/dist/cjs/utils/token'
import * as ed from '@noble/ed25519'
import { BGSG } from './utils'
import { Leaf, MerkleDistributor } from '../app'

const { data: PRIMARY_DUMMY_METADATA } = Buffer.from(
  'b2b68b298b9bfa2dd2931cd879e5c9997837209476d25319514b46f7b7911d31',
  'hex',
).toJSON()

const privateKey =
  BigInt(
    2760942959702842715352604833882983365211307188590135378997097481178767826057,
  )
const pubkey = ed.Point.BASE.multiply(privateKey)

const currentTime = Math.floor(Date.now() / 1000)
const PROGRAMS = {
  rent: web3.SYSVAR_RENT_PUBKEY,
  systemProgram: web3.SystemProgram.programId,
  associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
  tokenProgram: TOKEN_PROGRAM_ID,
}
const randomNumber = () => {
  const min = 1_000
  const max = 100_000_000
  return Math.floor(Math.random() * (max - min + 1)) + min
}
const randomKey = async () => {
  const r = ed.utils.randomBytes(32)
  const priv = ed.utils.mod(BigInt(`0x${ed.utils.bytesToHex(r)}`), ed.CURVE.n)
  const pubkey = await ed.getPublicKey(priv)
  return ed.Point.fromHex(pubkey)
}

describe('atbash-program', () => {
  const provider = AnchorProvider.local()
  setProvider(provider)
  provider.opts.skipPreflight = true
  const program = workspace.AtbashProgram as Program<AtbashProgram>

  let treeData: Leaf[]
  let proposal = web3.Keypair.generate()
  let myReceipt: web3.PublicKey
  let alice = web3.Keypair.generate()
  let aliceReceipt: web3.PublicKey
  let bob = web3.Keypair.generate()
  let carol = web3.Keypair.generate()
  let merkleDistributor: MerkleDistributor
  const candidates = [alice.publicKey, bob.publicKey, carol.publicKey]
  const commitment = randomNumber()

  before(async () => {
    // Tree data
    provider.connection.requestAirdrop(alice.publicKey, 10 ** 9)
    provider.connection.requestAirdrop(bob.publicKey, 10 ** 9)

    treeData = [alice.publicKey, provider.publicKey].map((publicKey, i) => ({
      authority: publicKey,
      salt: MerkleDistributor.salt(i.toString()),
    }))
    merkleDistributor = new MerkleDistributor(treeData)

    // Receipts
    const [aliceReceiptPublicKey, myReceiptPublickey] = await Promise.all(
      treeData.map(async ({ authority, salt }, i) => {
        const [receiptPublicKey] = await web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from('receipt'),
            salt,
            proposal.publicKey.toBuffer(),
            authority.toBuffer(),
          ],
          program.programId,
        )
        return receiptPublicKey
      }),
    )
    aliceReceipt = aliceReceiptPublicKey
    myReceipt = myReceiptPublickey
  })

  it('Is create Proposal', async () => {
    const randomsNumber: BN[] = []
    const ballotBoxes = candidates.map(() => {
      const r = randomNumber()
      randomsNumber.push(new BN(r))
      const M = ed.Point.ZERO
      return M.add(pubkey.multiply(r)).toRawBytes() // C = M + rG
    })
    const merkleRoot = merkleDistributor.deriveMerkleRoot()
    const tx = await program.methods
      .initializeProposal(
        PRIMARY_DUMMY_METADATA as any,
        candidates as any,
        new BN(currentTime),
        new BN(currentTime + 5000),
        ballotBoxes as any,
        randomsNumber as any,
        [...merkleRoot],
        new BN(commitment),
      )
      .accounts({
        authority: provider.publicKey,
        proposal: proposal.publicKey,
        rent: PROGRAMS.rent,
        systemProgram: PROGRAMS.systemProgram,
      })
      .transaction()
    await provider.sendAndConfirm(tx, [proposal])
    const fetch = await program.account.proposal.fetch(proposal.publicKey)
    console.log(fetch)
  })

  it('Is Alice Vote for Alice', async () => {
    const aliceData = treeData[0]
    const proof = merkleDistributor.deriveProof(aliceData)
    const P = ed.Point.BASE
    const votFor = alice.publicKey

    const randomsNumber: BN[] = []
    const proof_t: Uint8Array[] = []
    const proof_r: BN[] = []

    const votes = candidates.map((candidate) => {
      const x = randomNumber()
      randomsNumber.push(new BN(x))

      const v = randomNumber()
      const T = pubkey.multiply(v)
      // r = v + cx
      const r = v + commitment * x
      proof_r.push(new BN(r))
      proof_t.push(T.toRawBytes())

      const M =
        candidate.equals(votFor) || candidate.equals(bob.publicKey)
          ? P
          : ed.Point.ZERO
      return M.add(pubkey.multiply(x)).toRawBytes() // C = M + rG
    })

    try {
      await program.rpc.vote(
        votes as any,
        randomsNumber as any,
        aliceData.salt as any,
        proof as any,
        proof_t as any,
        proof_r,
        {
          accounts: {
            authority: alice.publicKey,
            proposal: proposal.publicKey,
            receipt: aliceReceipt,
            rent: PROGRAMS.rent,
            systemProgram: PROGRAMS.systemProgram,
          },
          signers: [alice],
        },
      )
    } catch (error) {
      console.log(error)
    }
  })

  it('Is Me Vote for Bob', async () => {
    const walletData = treeData[1]
    const proof = merkleDistributor.deriveProof(walletData)

    const P = ed.Point.BASE
    const votFor = bob.publicKey

    const randomsNumber: BN[] = []
    const proof_t: Uint8Array[] = []
    const proof_r: BN[] = []

    const votes = candidates.map((candidate) => {
      const x = randomNumber()
      randomsNumber.push(new BN(x))

      const v = randomNumber()
      const T = pubkey.multiply(v)
      // r = v + cx
      const r = v + commitment * x
      proof_r.push(new BN(r))
      proof_t.push(T.toRawBytes())

      const M = candidate.equals(votFor) ? P : ed.Point.ZERO
      return M.add(pubkey.multiply(x)).toRawBytes() // C = M + rG
    })

    const tx = await program.methods
      .vote(
        votes as any,
        randomsNumber as any,
        walletData.salt as any,
        proof as any,
        proof_t as any,
        proof_r,
      )
      .accounts({
        authority: provider.publicKey,
        proposal: proposal.publicKey,
        receipt: myReceipt,
        rent: PROGRAMS.rent,
        systemProgram: PROGRAMS.systemProgram,
      })
      .transaction()

    await provider.sendAndConfirm(tx, [])
  })

  it('Is Decrypt votes', async () => {
    const data = await program.account.proposal.fetch(proposal.publicKey)
    const ballotBoxesDecrypted: ed.Point[] = []
    const P = ed.Point.BASE
    data.ballotBoxes.forEach((ballot, i) => {
      const C = ed.Point.fromHex(new Uint8Array(ballot))
      const R = P.multiply(data.randomNumbers[i].toNumber())
      const M = C.subtract(R.multiply(privateKey)) //M = C - R * x
      ballotBoxesDecrypted.push(M)
    })
    const totalBallot: number[] = await BGSG(ballotBoxesDecrypted)
    const bnResult = totalBallot.map((e) => new BN(e))
    // const tx = await program.methods
    //   .submitResult(bnResult)
    //   .accounts({
    //     authority: provider.publicKey,
    //     proposal: proposal.publicKey,
    //     ...PROGRAMS,
    //   })
    //   .transaction()

    try {
      await program.rpc.submitResult(bnResult, {
        accounts: {
          authority: provider.publicKey,
          proposal: proposal.publicKey,
          ...PROGRAMS,
        },
        signers: [],
      })
    } catch (error) {
      console.log(error)
    }
    // await provider.sendAndConfirm(tx, [])
    const fetch = await program.account.proposal.fetch(proposal.publicKey)
    console.log(fetch)
  })

  it('Is soundness work', async () => {
    //P = Gx;
    const x = randomNumber()
    const G = pubkey
    const P = G.multiply(x)

    //T = Gv;
    const v = randomNumber()
    const T = G.multiply(v)

    const c = randomNumber()

    // r = v + cx
    const r = v + c * x
    console.log(100_000_0000 * 100_000_0000 + 100_000_000)

    console.log(x, r, v)

    //=========================================//
    console.log(G.multiply(r).subtract(P.multiply(c)).equals(T))
    //=========================================//
  })
})
