import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaStablecoin } from "../target/types/solana_stablecoin";
import { PublicKey } from "@solana/web3.js";

const TOKEN_NAME = "Robot USD";
const TOKEN_SYMBOL = "rUSD";
const METADATA_URI = "https://gateway.irys.xyz/K90PlNzt8g-Vvjgt4UYn22OuL5ixzxndTMZqCpLe_iw";

// Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaStablecoin as Program<SolanaStablecoin>;

  console.log("🎨 Creating metadata for rUSD token...");
  console.log("Program ID:", program.programId.toString());
  console.log("Authority:", provider.wallet.publicKey.toString());
  console.log("");

  // Derive stablecoin state PDA
  const [stablecoinState] = PublicKey.findProgramAddressSync(
    [Buffer.from("stablecoin")],
    program.programId
  );

  // Fetch state to get mint address
  const state = await program.account.stablecoinState.fetch(stablecoinState);
  const mintAddress = state.mint;

  console.log("Mint Address:", mintAddress.toString());
  console.log("Stablecoin State PDA:", stablecoinState.toString());
  console.log("");

  // Derive metadata account PDA (Metaplex standard)
  const [metadata] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintAddress.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  console.log("Metadata Account PDA:", metadata.toString());
  console.log("");
  console.log("Token Details:");
  console.log("- Name:", TOKEN_NAME);
  console.log("- Symbol:", TOKEN_SYMBOL);
  console.log("- URI:", METADATA_URI);
  console.log("");

  try {
    const tx = await program.methods
      .createMetadata(TOKEN_NAME, TOKEN_SYMBOL, METADATA_URI)
      .accountsPartial({
        stablecoinState: stablecoinState,
        mint: mintAddress,
        metadata: metadata,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ Metadata created successfully!");
    console.log("Transaction signature:", tx);
    console.log("");
    console.log("🔍 View on Solana Explorer:");
    console.log(`https://explorer.solana.com/address/${mintAddress.toString()}?cluster=devnet`);
    console.log("");
    console.log("🎉 Your token now has complete metadata!");
    console.log("   Wallets will display it as 'rUSD' with name and logo");
    console.log("");
    console.log("📋 Metadata Account:", metadata.toString());

  } catch (error: any) {
    console.error("❌ Failed to create metadata:", error);

    if (error.logs) {
      console.error("\nTransaction logs:");
      error.logs.forEach((log: string) => console.error("  ", log));
    }

    if (error.message?.includes("already in use")) {
      console.error("\n⚠️  This mint already has metadata attached.");
      console.error("   The metadata was successfully created previously.");
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
