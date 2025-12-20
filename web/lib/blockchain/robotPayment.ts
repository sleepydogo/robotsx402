import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';

// rUSD Token Mint Address on Devnet
const RUSD_MINT_ADDRESS = new PublicKey('8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX');

// Token decimals (usually 6 for stablecoins like USDC)
const RUSD_DECIMALS = 6;

interface CreateRobotPaymentParams {
  payer: PublicKey;
  recipient: string; // Robot owner's wallet address
  amount: number; // Amount in rUSD (will be converted to lamports)
  robotId: string;
  sendTransaction: any; // Wallet adapter's sendTransaction function
}

/**
 * Creates and sends a payment transaction for robot control session
 */
export async function createRobotPaymentTransaction({
  payer,
  recipient,
  amount,
  robotId,
  sendTransaction
}: CreateRobotPaymentParams): Promise<string> {
  try {
    // Connect to Solana cluster
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Convert recipient string to PublicKey
    const recipientPubkey = new PublicKey(recipient);

    // Convert amount to token units (multiply by 10^decimals)
    const amountInTokenUnits = Math.floor(amount * Math.pow(10, RUSD_DECIMALS));

    console.log('Creating payment transaction:', {
      payer: payer.toString(),
      recipient: recipientPubkey.toString(),
      amount,
      amountInTokenUnits,
      robotId
    });

    // Get associated token accounts
    const payerTokenAccount = await getAssociatedTokenAddress(
      RUSD_MINT_ADDRESS,
      payer,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      RUSD_MINT_ADDRESS,
      recipientPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Create transaction
    const transaction = new Transaction();

    // Check if recipient's token account exists
    let recipientAccountExists = true;
    try {
      await getAccount(connection, recipientTokenAccount, 'confirmed', TOKEN_PROGRAM_ID);
    } catch (error) {
      recipientAccountExists = false;
    }

    // If recipient doesn't have a token account, create it first
    if (!recipientAccountExists) {
      console.log('Creating associated token account for recipient...');
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payer, // Payer
          recipientTokenAccount, // Associated token account
          recipientPubkey, // Owner
          RUSD_MINT_ADDRESS, // Mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        payerTokenAccount, // Source
        recipientTokenAccount, // Destination
        payer, // Owner
        amountInTokenUnits, // Amount
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer;

    // Send transaction using wallet adapter
    const signature = await sendTransaction(transaction, connection);

    console.log('Transaction sent:', signature);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    console.log('Transaction confirmed:', signature);
    return signature;

  } catch (error: any) {
    console.error('Error creating payment transaction:', error);

    // Provide user-friendly error messages
    if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient rUSD balance. Please fund your wallet.');
    } else if (error.message?.includes('User rejected')) {
      throw new Error('Transaction was rejected.');
    } else if (error.message?.includes('Attempt to debit an account but found no record')) {
      throw new Error('You don\'t have a rUSD token account. Please obtain some rUSD first.');
    } else {
      throw new Error(error.message || 'Failed to process payment');
    }
  }
}

/**
 * Gets the rUSD balance for a wallet
 */
export async function getRUSDBalance(walletAddress: PublicKey): Promise<number> {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const tokenAccount = await getAssociatedTokenAddress(
      RUSD_MINT_ADDRESS,
      walletAddress,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const accountInfo = await getAccount(connection, tokenAccount, 'confirmed', TOKEN_PROGRAM_ID);

    // Convert from token units to rUSD
    const balance = Number(accountInfo.amount) / Math.pow(10, RUSD_DECIMALS);
    return balance;

  } catch (error) {
    console.error('Error getting rUSD balance:', error);
    return 0;
  }
}
