import { web3 } from '@coral-xyz/anchor'
import * as ed from '@noble/ed25519'

/**
 * Validate an address
 * @param address Base58 string
 * @returns true/false
 */
export const isAddress = (address: string | undefined): address is string => {
  if (!address) return false
  try {
    const publicKey = new web3.PublicKey(address)
    if (!publicKey) throw new Error('Invalid public key')
    return true
  } catch (er) {
    return false
  }
}

export const findReceipt = async (
  salt: Buffer,
  proposalPublicKey: web3.PublicKey,
  authorityPublicKey: web3.PublicKey,
  programId: web3.PublicKey,
) => {
  const [receiptPublicKey] = await web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from('receipt'),
      salt,
      proposalPublicKey.toBuffer(),
      authorityPublicKey.toBuffer(),
    ],
    programId,
  )
  return receiptPublicKey
}

export const BGSG = async (points: ed.Point[], totalVoter: number) => {
  const P = ed.Point.BASE
  const result = []
  for (const G of points) {
    for (let j = 1; j <= totalVoter; j++) {
      if (ed.Point.ZERO.equals(G)) {
        result.push(0)
        break
      }
      if (P.multiply(j).equals(G)) {
        result.push(j)
        break
      }
    }
  }
  return result
}
