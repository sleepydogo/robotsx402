/**
 * Script to mint rUSD tokens to a user's wallet
 * Usage: ts-node scripts/mint-rusd-to-user.ts <wallet_address> <amount>
 * Example: ts-node scripts/mint-rusd-to-user.ts 8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX 100
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaStablecoin } from "../target/types/solana_stablecoin";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

const MINT_ADDRESS = new PublicKey("8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX");

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: ts-node scripts/mint-rusd-to-user.ts <wallet_address> <amount>");
    console.error("Example: ts-node scripts/mint-rusd-to-user.ts 8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX 100");
    process.exit(1);
  }

  const recipientAddress = args[0];
  const amount = parseFloat(args[1]);

  if (isNaN(amount) || amount <= 0) {
    console.error("Error: Amount must be a positive number");
    process.exit(1);
  }

  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaStablecoin as Program<SolanaStablecoin>;

  console.log("🪙 Minting rUSD Tokens");
  console.log("=====================");
  console.log("Mint:", MINT_ADDRESS.toString());
  console.log("Recipient:", recipientAddress);
  console.log("Amount:", amount, "rUSD");
  console.log("Authority:", provider.wallet.publicKey.toString());
  console.log("");

  try {
    // Convert recipient string to PublicKey
    const recipient = new PublicKey(recipientAddress);

    // Get or create recipient's token account
    const recipientTokenAccount = await getAssociatedTokenAddress(
      MINT_ADDRESS,
      recipient,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log("Recipient Token Account:", recipientTokenAccount.toString());

    // Check if token account exists
    let accountExists = true;
    try {
      await getAccount(provider.connection, recipientTokenAccount, "confirmed", TOKEN_PROGRAM_ID);
      console.log("✓ Token account exists");
    } catch (error) {
      accountExists = false;
      console.log("⚠ Token account does not exist, creating...");
    }

    // Create token account if it doesn't exist
    if (!accountExists) {
      const createAccountIx = createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        recipientTokenAccount,
        recipient,
        MINT_ADDRESS,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const createAccountTx = new anchor.web3.Transaction().add(createAccountIx);
      const createSig = await provider.sendAndConfirm(createAccountTx);
      console.log("✓ Created token account:", createSig);
    }

    // Derive stablecoin PDA
    const [stablecoinPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("stablecoin")],
      program.programId
    );

    // Convert amount to token units (6 decimals)
    const amountInTokenUnits = new anchor.BN(amount * 1_000_000);

    console.log("\n⏳ Minting tokens...");

    // Mint tokens
    const tx = await program.methods
      .mintTokens(amountInTokenUnits)
      .accountsPartial({
        mint: MINT_ADDRESS,
        to: recipientTokenAccount,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ Successfully minted", amount, "rUSD");
    console.log("Transaction signature:", tx);
    console.log(`\nhttps://explorer.solana.com/tx/${tx}?cluster=devnet`);
    console.log(`https://explorer.solana.com/address/${recipientTokenAccount}?cluster=devnet`);

    // Get updated balance
    const accountInfo = await getAccount(provider.connection, recipientTokenAccount, "confirmed", TOKEN_PROGRAM_ID);
    const balance = Number(accountInfo.amount) / 1_000_000;
    console.log("\n📊 New Balance:", balance, "rUSD");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
