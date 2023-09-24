import { Wallet, web3 } from '@coral-xyz/anchor'
import { decode } from 'bs58'

import Atbash from '../dist/app/core'
import { Leaf, MerkleDistributor } from '../dist/app/merkleDistributor'

const PRIV_KEY =
  '2EoKt7jkF3eJrN1adzX9yvTaXLMyvZSg4wFFM9Swhwyi3ERsDgWGPDgU52NGjnn4TbaNDGpHUeYbxDW3A6RPE9Ze'
const { data: PRIMARY_DUMMY_METADATA } = Buffer.from(
  'b2b68b298b9bfa2dd2931cd879e5c9997837209476d25319514b46f7b7911d31',
  'hex',
).toJSON()
describe('Atbash', () => {
  const wallet = new Wallet(web3.Keypair.fromSecretKey(decode(PRIV_KEY)))

  let atbash: Atbash
  let treeData: Leaf[]
  let merkleDistributor: MerkleDistributor
  let alice = web3.Keypair.generate()
  let bob = web3.Keypair.generate()
  let carol = web3.Keypair.generate()
  const candidates = [alice.publicKey, bob.publicKey, carol.publicKey]
  const voters = [wallet.publicKey]
  let proposal = ''

  before(() => {
    atbash = new Atbash(wallet)

    treeData = voters.map((publicKey, i) => ({
      authority: publicKey,
      salt: MerkleDistributor.salt(i.toString()),
    }))
    merkleDistributor = new MerkleDistributor(treeData)
  })

  it('Is create Proposal', async () => {
    const startTime = Date.now() / 1000
    const endTime = Date.now() / 1000 + 18
    const { txId, proposalAddress } = await atbash.initializeProposal({
      candidates,
      voters,
      endTime,
      startTime,
      metadata: PRIMARY_DUMMY_METADATA,
    })
    proposal = proposalAddress.toBase58()
    return txId
  })

  it('Is Vote', async () => {
    const proof = merkleDistributor.deriveProof(treeData[0])
    const { txId } = await atbash.vote({
      data: treeData[0],
      proof,
      proposalAddress: proposal,
      votFor: carol.publicKey,
    })
    console.log(txId, proposal)
    return txId
  })

  it('Is Decrypt', async () => {
    const result = await atbash.getResult({
      proposalAddress: 'EwmMp6i16svRhRtweGVy5pKdnZJ3youUWM6PhPuzeEXz',
    })
    console.log(result)
  })
})
