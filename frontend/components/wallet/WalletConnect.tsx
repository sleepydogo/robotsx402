'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import bs58 from 'bs58';

export function WalletConnect() {
  const { publicKey, signMessage, connected } = useWallet();
  const { walletLogin, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated && mounted) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, mounted, router]);

  const handleLogin = async () => {
    if (!publicKey || !signMessage) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const message = `Sign this message to login to x402 Platform\n\nWallet: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);
      const base58Signature = bs58.encode(signature);

      await walletLogin(publicKey.toBase58(), base58Signature, message);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login');
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-48 bg-white/5 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <WalletMultiButton />

      {connected && !isAuthenticated && (
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="px-6 py-3 bg-neon-cyan/10 border border-neon-cyan hover:bg-neon-cyan/20 text-neon-cyan rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
        >
          {isLoading ? 'Signing...' : 'Sign In with Wallet'}
        </button>
      )}

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
}
