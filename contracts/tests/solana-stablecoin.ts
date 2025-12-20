import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaStablecoin } from "../target/types/solana_stablecoin";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { assert } from "chai";

describe("solana-stablecoin", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaStablecoin as Program<SolanaStablecoin>;

  let mint: PublicKey;
  let stablecoinState: PublicKey;
  let userTokenAccount: PublicKey;
  let user2TokenAccount: PublicKey;
  const user2 = Keypair.generate();

  before(async () => {
    const [stablecoinStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("stablecoin")],
      program.programId
    );
    stablecoinState = stablecoinStatePDA;

    userTokenAccount = await getAssociatedTokenAddress(
      mint,
      provider.wallet.publicKey
    );

    const airdropSig = await provider.connection.requestAirdrop(
      user2.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);
  });

  it("Initialize stablecoin", async () => {
    const mintKeypair = Keypair.generate();
    mint = mintKeypair.publicKey;

    const tx = await program.methods
      .initialize(6)
      .accounts({
        stablecoinState: stablecoinState,
        mint: mint,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();

    console.log("Initialize transaction signature:", tx);

    const state = await program.account.stablecoinState.fetch(stablecoinState);
    assert.equal(state.authority.toString(), provider.wallet.publicKey.toString());
    assert.equal(state.mint.toString(), mint.toString());
    assert.equal(state.totalSupply.toNumber(), 0);
    assert.equal(state.paused, false);
    assert.equal(state.decimals, 6);
  });

  it("Mint tokens", async () => {
    userTokenAccount = await getAssociatedTokenAddress(
      mint,
      provider.wallet.publicKey
    );

    const createAtaIx = createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey,
      userTokenAccount,
      provider.wallet.publicKey,
      mint
    );

    const createAtaTx = new anchor.web3.Transaction().add(createAtaIx);
    await provider.sendAndConfirm(createAtaTx);

    const mintAmount = new anchor.BN(1000000);

    const tx = await program.methods
      .mintTokens(mintAmount)
      .accounts({
        stablecoinState: stablecoinState,
        mint: mint,
        to: userTokenAccount,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Mint transaction signature:", tx);

    const state = await program.account.stablecoinState.fetch(stablecoinState);
    assert.equal(state.totalSupply.toNumber(), mintAmount.toNumber());

    const tokenAccount = await provider.connection.getTokenAccountBalance(userTokenAccount);
    assert.equal(tokenAccount.value.amount, mintAmount.toString());
  });

  it("Transfer tokens", async () => {
    user2TokenAccount = await getAssociatedTokenAddress(
      mint,
      user2.publicKey
    );

    const createAtaIx = createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey,
      user2TokenAccount,
      user2.publicKey,
      mint
    );

    const createAtaTx = new anchor.web3.Transaction().add(createAtaIx);
    await provider.sendAndConfirm(createAtaTx);

    const transferAmount = new anchor.BN(100000);

    const tx = await program.methods
      .transferTokens(transferAmount)
      .accounts({
        stablecoinState: stablecoinState,
        from: userTokenAccount,
        to: user2TokenAccount,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Transfer transaction signature:", tx);

    const user2Account = await provider.connection.getTokenAccountBalance(user2TokenAccount);
    assert.equal(user2Account.value.amount, transferAmount.toString());
  });

  it("Burn tokens", async () => {
    const burnAmount = new anchor.BN(50000);

    const stateBefore = await program.account.stablecoinState.fetch(stablecoinState);
    const totalSupplyBefore = stateBefore.totalSupply.toNumber();

    const tx = await program.methods
      .burnTokens(burnAmount)
      .accounts({
        stablecoinState: stablecoinState,
        mint: mint,
        from: userTokenAccount,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Burn transaction signature:", tx);

    const stateAfter = await program.account.stablecoinState.fetch(stablecoinState);
    assert.equal(
      stateAfter.totalSupply.toNumber(),
      totalSupplyBefore - burnAmount.toNumber()
    );
  });

  it("Pause contract", async () => {
    const tx = await program.methods
      .pause()
      .accounts({
        stablecoinState: stablecoinState,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Pause transaction signature:", tx);

    const state = await program.account.stablecoinState.fetch(stablecoinState);
    assert.equal(state.paused, true);
  });

  it("Cannot mint when paused", async () => {
    const mintAmount = new anchor.BN(100000);

    try {
      await program.methods
        .mintTokens(mintAmount)
        .accounts({
          stablecoinState: stablecoinState,
          mint: mint,
          to: userTokenAccount,
          authority: provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      assert.fail("Should have thrown an error");
    } catch (error) {
      assert.include(error.toString(), "ContractPaused");
    }
  });

  it("Unpause contract", async () => {
    const tx = await program.methods
      .unpause()
      .accounts({
        stablecoinState: stablecoinState,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    console.log("Unpause transaction signature:", tx);

    const state = await program.account.stablecoinState.fetch(stablecoinState);
    assert.equal(state.paused, false);
  });

  it("Mint works after unpause", async () => {
    const mintAmount = new anchor.BN(100000);
    const stateBefore = await program.account.stablecoinState.fetch(stablecoinState);

    const tx = await program.methods
      .mintTokens(mintAmount)
      .accounts({
        stablecoinState: stablecoinState,
        mint: mint,
        to: userTokenAccount,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Mint after unpause transaction signature:", tx);

    const stateAfter = await program.account.stablecoinState.fetch(stablecoinState);
    assert.equal(
      stateAfter.totalSupply.toNumber(),
      stateBefore.totalSupply.toNumber() + mintAmount.toNumber()
    );
  });
});
