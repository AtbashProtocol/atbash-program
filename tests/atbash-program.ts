import {
  Program,
  AnchorProvider,
  setProvider,
  workspace,
  web3,
  BN,
} from "@coral-xyz/anchor";
import { AtbashProgram } from "../target/types/atbash_program";
import {
  ASSOCIATED_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@coral-xyz/anchor/dist/cjs/utils/token";
import * as ed from "@noble/ed25519";
import { BGSG } from "./utils";

const { data: PRIMARY_DUMMY_METADATA } = Buffer.from(
  "b2b68b298b9bfa2dd2931cd879e5c9997837209476d25319514b46f7b7911d31",
  "hex"
).toJSON();

const privateKey =
  BigInt(
    2760942959702842715352604833882983365211307188590135378997097481178767826057
  );
const pubkey = ed.Point.BASE.multiply(privateKey);

const currentTime = Math.floor(Date.now() / 1000);
const PROGRAMS = {
  rent: web3.SYSVAR_RENT_PUBKEY,
  systemProgram: web3.SystemProgram.programId,
  associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
  tokenProgram: TOKEN_PROGRAM_ID,
};
const randomNumber = () => {
  const min = 1;
  const max = 1_000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
const randomKey = async () => {
  const r = ed.utils.randomBytes(32);
  const priv = ed.utils.mod(BigInt(`0x${ed.utils.bytesToHex(r)}`), ed.CURVE.n);
  const pubkey = await ed.getPublicKey(priv);
  return ed.Point.fromHex(pubkey);
};

describe("atbash-program", () => {
  const provider = AnchorProvider.local();
  setProvider(provider);
  provider.opts.skipPreflight = true;
  const program = workspace.AtbashProgram as Program<AtbashProgram>;

  let proposal = web3.Keypair.generate();
  let alice = web3.Keypair.generate();
  let bob = web3.Keypair.generate();
  let carol = web3.Keypair.generate();
  const candidates = [alice.publicKey, bob.publicKey, carol.publicKey];

  it("Is create Proposal", async () => {
    const P = ed.Point.BASE;
    const randomsNumber: BN[] = [];
    const ballotBoxes = candidates.map(() => {
      const r = randomNumber();
      randomsNumber.push(new BN(r));
      const M = ed.Point.ZERO;
      return M.add(pubkey.multiply(r)).toRawBytes(); // C = M + rG
    });

    const tx = await program.methods
      .initializeProposal(
        PRIMARY_DUMMY_METADATA as any,
        candidates as any,
        new BN(currentTime + 10),
        new BN(currentTime + 20),
        ballotBoxes as any,
        randomsNumber as any
      )
      .accounts({
        authority: provider.publicKey,
        proposal: proposal.publicKey,
        rent: PROGRAMS.rent,
        systemProgram: PROGRAMS.systemProgram,
      })
      .transaction();
    await provider.sendAndConfirm(tx, [proposal]);
    const data = await program.account.proposal.fetch(proposal.publicKey);
    console.log("ballotBoxes====>", data.ballotBoxes);
  });

  it("Is Vote 15 times for Alice", async () => {
    const P = ed.Point.BASE;
    const votFor = alice.publicKey;

    for (let i = 0; i < 15; i++) {
      const randomsNumber: BN[] = [];

      const votes = candidates.map((candidate) => {
        const r = randomNumber();
        randomsNumber.push(new BN(r));
        const M = candidate.equals(votFor) ? P.multiply(1) : ed.Point.ZERO;
        return M.add(pubkey.multiply(r)).toRawBytes(); // C = M + rG
      });

      const randomReceipt = web3.Keypair.generate();
      const tx = await program.methods
        .vote(votes as any, randomsNumber as any)
        .accounts({
          authority: provider.publicKey,
          proposal: proposal.publicKey,
          receipt: randomReceipt.publicKey,
          rent: PROGRAMS.rent,
          systemProgram: PROGRAMS.systemProgram,
        })
        .transaction();
      await provider.sendAndConfirm(tx, [randomReceipt]);
    }

    const data = await program.account.proposal.fetch(proposal.publicKey);
    console.log("ballotBoxes after vote for Alice: ", data);
  });

  it("Is Vote 5 times for Bob", async () => {
    const P = ed.Point.BASE;
    const votFor = bob.publicKey;

    for (let i = 0; i < 5; i++) {
      const randomsNumber: BN[] = [];

      const votes = candidates.map((candidate) => {
        const r = randomNumber();
        randomsNumber.push(new BN(r));
        const M = candidate.equals(votFor) ? P.multiply(1) : ed.Point.ZERO;
        return M.add(pubkey.multiply(r)).toRawBytes(); // C = M + rG
      });

      const randomReceipt = web3.Keypair.generate();
      const tx = await program.methods
        .vote(votes as any, randomsNumber as any)
        .accounts({
          authority: provider.publicKey,
          proposal: proposal.publicKey,
          receipt: randomReceipt.publicKey,
          rent: PROGRAMS.rent,
          systemProgram: PROGRAMS.systemProgram,
        })
        .transaction();
      await provider.sendAndConfirm(tx, [randomReceipt]);
    }

    const data = await program.account.proposal.fetch(proposal.publicKey);
    console.log("ballotBoxes after vote for Bob:", data.ballotBoxes);
  });

  it("Is Decrypt votes", async () => {
    const data = await program.account.proposal.fetch(proposal.publicKey);
    const ballotBoxesDecrypted: ed.Point[] = [];
    const P = ed.Point.BASE;
    data.ballotBoxes.forEach((ballot, i) => {
      const C = ed.Point.fromHex(new Uint8Array(ballot));
      const R = P.multiply(data.randomNumbers[i].toNumber());
      const M = C.subtract(R.multiply(privateKey));
      ballotBoxesDecrypted.push(M);
    });
    const totalBallot = await BGSG(ballotBoxesDecrypted);
    console.log("totalBallots", totalBallot);
  });
});
