'use client';
import React from 'react';
import { Wallet, Zap } from 'lucide-react';

export default function WalletGas() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
                <Wallet className="text-neon-cyan" />
                <h3 className="font-bold">USDC Balance</h3>
            </div>
            <p className="text-4xl font-mono font-bold">1,240.50 <span className="text-sm text-gray-500">USDC</span></p>
        </div>

        <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
                <Zap className="text-amber-400" />
                <h3 className="font-bold">Gas Credits</h3>
            </div>
            <p className="text-4xl font-mono font-bold">0.045 <span className="text-sm text-gray-500">ETH</span></p>
        </div>
    </div>
  );
}