import * as ed from '@noble/ed25519'

export const BGSG = async (points: ed.Point[]) => {
  const P = ed.Point.BASE
  const result: number[] = []
  for (const G of points) {
    for (let j = 1; j <= 100; j++) {
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

export const bigintToUint8Array = (bigint: bigint) => {
  // Convert the BigInt to a hexadecimal string
  const hexString = bigint.toString(16)

  // Ensure the hexadecimal string has an even length
  const paddedHexString =
    hexString.length % 2 === 0 ? hexString : `0${hexString}`

  // Create a Uint8Array with half the length of the hexadecimal string
  const uint8Array = new Uint8Array(32)

  // Convert each pair of characters from the hexadecimal string to a byte
  for (let i = 0; i < uint8Array.length; i++) {
    const startIndex = i * 2
    const byteHex = paddedHexString.substr(startIndex, 2)
    const byteValue = parseInt(byteHex, 16)
    uint8Array[i] = byteValue ? byteValue : 0
  }

  return uint8Array
}
