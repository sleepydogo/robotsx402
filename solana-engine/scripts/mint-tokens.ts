import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaStablecoin } from "../target/types/solana_stablecoin";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaStablecoin as Program<SolanaStablecoin>;

  const [stablecoinState] = PublicKey.findProgramAddressSync(
    [Buffer.from("stablecoin")],
    program.programId
  );

  const state = await program.account.stablecoinState.fetch(stablecoinState);
  const mint = state.mint;

  console.log("Minting tokens...");
  console.log("Mint:", mint.toString());

  const userTokenAccount = await getAssociatedTokenAddress(
    mint,
    provider.wallet.publicKey
  );

  console.log("User Token Account:", userTokenAccount.toString());

  try {
    const accountInfo = await provider.connection.getAccountInfo(userTokenAccount);
    if (!accountInfo) {
      console.log("Creating associated token account...");
      const createAtaIx = createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        userTokenAccount,
        provider.wallet.publicKey,
        mint
      );

      const createAtaTx = new anchor.web3.Transaction().add(createAtaIx);
      await provider.sendAndConfirm(createAtaTx);
      console.log("✅ Token account created");
    }
  } catch (error) {
    console.log("Error checking token account:", error);
  }

  const mintAmount = new anchor.BN(1000000000);

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

  console.log("\n✅ Tokens minted successfully!");
  console.log("Transaction signature:", tx);
  console.log("Amount:", mintAmount.toString());

  const tokenAccount = await provider.connection.getTokenAccountBalance(userTokenAccount);
  console.log("Your balance:", tokenAccount.value.uiAmount);

  const updatedState = await program.account.stablecoinState.fetch(stablecoinState);
  console.log("Total supply:", updatedState.totalSupply.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
