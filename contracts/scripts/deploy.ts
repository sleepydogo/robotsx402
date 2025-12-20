import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaStablecoin } from "../target/types/solana_stablecoin";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaStablecoin as Program<SolanaStablecoin>;

  console.log("Deploying Stablecoin to Devnet...");
  console.log("Program ID:", program.programId.toString());
  console.log("Authority:", provider.wallet.publicKey.toString());

  const mintKeypair = Keypair.generate();
  console.log("Mint Address:", mintKeypair.publicKey.toString());

  const [stablecoinState] = PublicKey.findProgramAddressSync(
    [Buffer.from("stablecoin")],
    program.programId
  );
  console.log("Stablecoin State PDA:", stablecoinState.toString());

  const decimals = 6;

  const tx = await program.methods
    .initialize(decimals)
    .accountsPartial({
      mint: mintKeypair.publicKey,
      authority: provider.wallet.publicKey,
    })
    .signers([mintKeypair])
    .rpc();

  console.log("\n✅ Stablecoin initialized successfully!");
  console.log("Transaction signature:", tx);
  console.log("\nStablecoin Details:");
  console.log("- Mint:", mintKeypair.publicKey.toString());
  console.log("- Decimals:", decimals);
  console.log("- Authority:", provider.wallet.publicKey.toString());
  console.log("- State Account:", stablecoinState.toString());

  const state = await program.account.stablecoinState.fetch(stablecoinState);
  console.log("\nState verification:");
  console.log("- Total Supply:", state.totalSupply.toString());
  console.log("- Paused:", state.paused);
  console.log("- Decimals:", state.decimals);

  console.log("\n🎉 Deployment complete!");
  console.log("\nView on Solana Explorer:");
  console.log(`https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=devnet`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
