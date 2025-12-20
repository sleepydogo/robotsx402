'use client';

import { motion } from 'framer-motion';
import { Cpu, Wallet } from 'lucide-react';
import { WalletConnect } from '@/components/wallet/WalletConnect';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-cyber-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-transparent to-transparent"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <Cpu className="w-10 h-10 text-neon-cyan" />
            <h1 className="text-3xl font-bold tracking-widest">
              x402<span className="text-neon-cyan">PLATFORM</span>
            </h1>
          </motion.div>
          <p className="text-gray-500 text-sm font-mono">WALLET ACCESS TERMINAL</p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8"
        >
          <div className="text-center mb-6">
            <Wallet className="w-12 h-12 text-neon-cyan mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">CONNECT WALLET</h2>
            <p className="text-sm text-gray-400 font-mono">
              Use your Solana wallet to access the platform
            </p>
          </div>

          {/* Wallet Connect */}
          <div className="flex justify-center">
            <WalletConnect />
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6 font-mono">
          SOLANA DEVNET • ENCRYPTED CONNECTION
        </p>
      </motion.div>
    </div>
  );
}
