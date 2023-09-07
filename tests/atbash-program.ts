import {
  Program,
  AnchorProvider,
  setProvider,
  workspace,
  web3,
  BN,
} from "@coral-xyz/anchor";
import { AtbashProgram } from "../target/types/atbash_program";
import { initAccountToken, initializeMint, mintTo } from "./pretest";
import {
  ASSOCIATED_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@coral-xyz/anchor/dist/cjs/utils/token";
import * as ed from "@noble/ed25519";

const { data: PRIMARY_DUMMY_METADATA } = Buffer.from(
  "b2b68b298b9bfa2dd2931cd879e5c9997837209476d25319514b46f7b7911d31",
  "hex"
).toJSON();
const currentTime = Math.floor(Date.now() / 1000);
const PROGRAMS = {
  rent: web3.SYSVAR_RENT_PUBKEY,
  systemProgram: web3.SystemProgram.programId,
  associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
  tokenProgram: TOKEN_PROGRAM_ID,
};

const randomPoint = async () => {
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

  let MINT = web3.Keypair.generate();
  let proposal = web3.Keypair.generate();
  let alice = web3.Keypair.generate();
  let bob = web3.Keypair.generate();
  let carol = web3.Keypair.generate();

  let AMOUNT = new BN(1_000_000_000);
  before("Is generate data!", async () => {
    // await program.provider.connection.requestAirdrop(
    //   carol.publicKey,
    //   web3.LAMPORTS_PER_SOL
    // );

    await initializeMint(9, MINT);
    await initAccountToken(MINT.publicKey, provider);
    await mintTo(AMOUNT, MINT.publicKey, provider.publicKey);
    // await mintTo(AMOUNT, MINT.publicKey, carol.publicKey);
  });

  it("Is calculate Point work on Anchor", async () => {
    const point = await randomPoint();
    const addPoint = point.add(point);
    console.log("Add 2 point result ===> ", addPoint.toRawBytes());
    const pointWithScalar = point.multiply(123344);
    console.log(
      "Mul point with scalar result ===>",
      pointWithScalar.toRawBytes()
    );

    const tx = await program.methods
      .math(point.toRawBytes())
      .accounts({
        authority: provider.publicKey,
        math: proposal.publicKey,
        rent: PROGRAMS.rent,
        systemProgram: PROGRAMS.systemProgram,
      })
      .transaction();

    const txId = await provider.sendAndConfirm(tx, [proposal]);

    const data = await program.account.math.fetch(proposal.publicKey);
    console.log("Your transaction signature", txId);
    console.log("Result: ", data);
  });
});
