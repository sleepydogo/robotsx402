import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

// rUSD Token Mint Address on Devnet
const RUSD_MINT_ADDRESS = new PublicKey('8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX');
const RUSD_DECIMALS = 6;

/**
 * Get SOL balance for a wallet
 */
export async function getSOLBalance(walletAddress: PublicKey): Promise<number> {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const balance = await connection.getBalance(walletAddress);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting SOL balance:', error);
    return 0;
  }
}

/**
 * Get rUSD balance for a wallet
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

/**
 * Request airdrop of SOL (devnet only)
 */
export async function requestSOLAirdrop(walletAddress: PublicKey, amount: number = 1): Promise<string> {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const signature = await connection.requestAirdrop(
      walletAddress,
      amount * LAMPORTS_PER_SOL
    );

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    return signature;
  } catch (error: any) {
    console.error('Error requesting airdrop:', error);
    throw new Error(error.message || 'Failed to request airdrop');
  }
}

/**
 * Get recent transactions for a wallet
 */
export async function getRecentTransactions(walletAddress: PublicKey, limit: number = 10) {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const signatures = await connection.getSignaturesForAddress(walletAddress, { limit });

    return signatures.map(sig => ({
      signature: sig.signature,
      slot: sig.slot,
      timestamp: sig.blockTime ? new Date(sig.blockTime * 1000) : null,
      err: sig.err,
      memo: sig.memo,
    }));
  } catch (error) {
    console.error('Error getting recent transactions:', error);
    return [];
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Shorten wallet address for display
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
