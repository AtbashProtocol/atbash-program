import * as ed from "@noble/ed25519";

export const BGSG = async (points: ed.Point[]) => {
  const P = ed.Point.BASE;
  const result = [];
  for (const G of points) {
    for (let j = 1; j <= 100; j++) {
      if (ed.Point.ZERO.equals(G)) {
        result.push(0);
        break;
      }
      if (P.multiply(j).equals(G)) {
        result.push(j);
        break;
      }
    }
  }
  return result;
};
