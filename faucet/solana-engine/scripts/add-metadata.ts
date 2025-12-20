import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createMetadataAccountV3 } from '@metaplex-foundation/mpl-token-metadata';
import {
  publicKey,
  keypairIdentity,
  createSignerFromKeypair
} from '@metaplex-foundation/umi';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';


const MINT_ADDRESS = "8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX";
const TOKEN_NAME = "Robot USD";           
const TOKEN_SYMBOL = "rUSD";
const TOKEN_DESCRIPTION = "Stablecoin designed for robot and IoT service payments on the x402 protocol";
const METADATA_URI = "https://gateway.irys.xyz/K90PlNzt8g-Vvjgt4UYn22OuL5ixzxndTMZqCpLe_iw";

// ============================================

async function main() {
  // Crear UMI instance conectado a devnet
  const umi = createUmi('https://api.devnet.solana.com');

  // Cargar wallet desde ~/.config/solana/id.json
  const walletPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  const walletJson = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const walletKeypair = umi.eddsa.createKeypairFromSecretKey(
    new Uint8Array(walletJson)
  );

  // Configurar signer
  umi.use(keypairIdentity(walletKeypair));

  console.log("🎨 Adding metadata to token...");
  console.log("Mint:", MINT_ADDRESS);
  console.log("Name:", TOKEN_NAME);
  console.log("Symbol:", TOKEN_SYMBOL);
  console.log("Description:", TOKEN_DESCRIPTION);
  console.log("URI:", METADATA_URI);
  console.log("");

  if (METADATA_URI.includes("REEMPLAZAR")) {
    console.warn("⚠️  Advertencia: METADATA_URI no ha sido configurado");
    console.warn("   El metadata JSON debe estar alojado en IPFS o servidor web");
    console.warn("   Por ahora se usará una URI placeholder\n");
  }

  try {
    const mint = publicKey(MINT_ADDRESS);
    const signer = createSignerFromKeypair(umi, walletKeypair);

    // Crear metadata account
    const tx = await createMetadataAccountV3(umi, {
      mint,
      mintAuthority: signer,
      updateAuthority: walletKeypair.publicKey,
      data: {
        name: TOKEN_NAME,
        symbol: TOKEN_SYMBOL,
        uri: METADATA_URI,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      },
      isMutable: true,
      collectionDetails: null,
    }).sendAndConfirm(umi);

    const signature = Buffer.from(tx.signature).toString('base64');

    console.log("✅ Metadata added successfully!");
    console.log("Transaction signature:", signature);
    console.log("");
    console.log("🔍 View on Solana Explorer:");
    console.log(`https://explorer.solana.com/address/${MINT_ADDRESS}?cluster=devnet`);
    console.log("");
    console.log("📋 Token Details:");
    console.log(`   Name: ${TOKEN_NAME}`);
    console.log(`   Symbol: ${TOKEN_SYMBOL}`);
    console.log(`   Description: ${TOKEN_DESCRIPTION}`);
    console.log("");
    console.log("🎉 Your token now has complete metadata!");
    console.log("   Wallets will display it as 'rUSD' with name and logo");

  } catch (error: any) {
    console.error("❌ Failed to add metadata:", error);

    if (error.message?.includes("already in use")) {
      console.error("\n⚠️  This mint already has metadata attached.");
      console.error("   To update metadata, use a different script with updateMetadataAccountV2");
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
