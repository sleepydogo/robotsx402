'use client';
import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Zap,
  Copy,
  Check,
  RefreshCw,
  TrendingUp,
  Activity,
  ExternalLink,
  Loader2,
  AlertCircle,
  Award,
  Calendar,
  Hash
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  getSOLBalance,
  getRUSDBalance,
  requestSOLAirdrop,
  shortenAddress,
  copyToClipboard
} from '@/lib/blockchain/wallet';
import { getMyPaymentStats, PaymentStats } from '@/lib/api/payments';
import { motion } from 'framer-motion';

export default function WalletGas() {
  const { publicKey, connected } = useWallet();

  const [solBalance, setSolBalance] = useState<number>(0);
  const [rusdBalance, setRusdBalance] = useState<number>(0);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [airdropping, setAirdropping] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (connected && publicKey) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [connected, publicKey]);

  const fetchAllData = async () => {
    if (!publicKey) return;

    setLoading(true);
    setError('');

    try {
      // Fetch balances and stats in parallel
      const [sol, rusd, paymentStats] = await Promise.all([
        getSOLBalance(publicKey),
        getRUSDBalance(publicKey),
        getMyPaymentStats().catch(() => null) // Don't fail if stats fail
      ]);

      setSolBalance(sol);
      setRusdBalance(rusd);
      setStats(paymentStats);
    } catch (err: any) {
      console.error('Error fetching wallet data:', err);
      setError(err.message || 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!publicKey) return;

    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const handleCopy = async () => {
    if (!publicKey) return;

    const success = await copyToClipboard(publicKey.toString());
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAirdrop = async () => {
    if (!publicKey) return;

    setAirdropping(true);
    setError('');

    try {
      await requestSOLAirdrop(publicKey, 1);
      // Refresh balances after airdrop
      await handleRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to request airdrop');
    } finally {
      setAirdropping(false);
    }
  };

  const handleViewExplorer = () => {
    if (!publicKey) return;
    window.open(`https://explorer.solana.com/address/${publicKey.toString()}?cluster=devnet`, '_blank');
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full border border-dashed border-white/10 rounded-xl bg-white/5 p-12">
        <Wallet className="text-gray-600 mb-4" size={64} />
        <h3 className="text-xl font-bold text-white mb-2">Wallet Not Connected</h3>
        <p className="text-gray-400 text-center max-w-md">
          Connect your Solana wallet to view your balance, transaction history, and payment statistics.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="animate-spin text-neon-cyan mb-4" size={48} />
        <p className="text-gray-400 font-mono">Loading wallet data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Wallet & Gas</h2>
          <p className="text-gray-400 text-sm mt-1">Manage your balances and view statistics</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={refreshing ? 'animate-spin' : ''} size={20} />
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start gap-3"
        >
          <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Wallet Address Card */}
      <div className="bg-gradient-to-br from-neon-cyan/10 via-purple-500/10 to-neon-cyan/10 border border-neon-cyan/20 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Wallet size={18} className="text-neon-cyan" />
            Wallet Address
          </h3>
          <button
            onClick={handleViewExplorer}
            className="text-neon-cyan hover:text-white text-sm flex items-center gap-1 transition-colors"
          >
            <ExternalLink size={14} />
            Explorer
          </button>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-sm text-white bg-black/30 px-3 py-2 rounded">
            {publicKey ? shortenAddress(publicKey.toString(), 8) : 'Not connected'}
          </code>
          <button
            onClick={handleCopy}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-all"
            title="Copy address"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* rUSD Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-neon-cyan/50 transition-all group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-neon-cyan/10 rounded-lg group-hover:bg-neon-cyan/20 transition-colors">
              <Wallet className="text-neon-cyan" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white">rUSD Balance</h3>
              <p className="text-xs text-gray-500">Robot USD Token</p>
            </div>
          </div>
          <p className="text-4xl font-mono font-bold text-white">
            {rusdBalance.toFixed(4)} <span className="text-lg text-gray-500">rUSD</span>
          </p>
        </motion.div>

        {/* SOL Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 p-6 rounded-xl border border-white/10 hover:border-amber-400/50 transition-all group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-400/10 rounded-lg group-hover:bg-amber-400/20 transition-colors">
              <Zap className="text-amber-400" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white">SOL Balance</h3>
              <p className="text-xs text-gray-500">Gas for Transactions</p>
            </div>
          </div>
          <p className="text-4xl font-mono font-bold text-white">
            {solBalance.toFixed(4)} <span className="text-lg text-gray-500">SOL</span>
          </p>
          {solBalance < 0.1 && (
            <button
              onClick={handleAirdrop}
              disabled={airdropping}
              className="mt-4 w-full py-2 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 rounded text-amber-300 text-sm font-mono transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {airdropping ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Requesting...
                </>
              ) : (
                <>
                  <Zap size={14} />
                  Request Airdrop (1 SOL)
                </>
              )}
            </button>
          )}
        </motion.div>
      </div>

      {/* Payment Statistics */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6"
        >
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="text-neon-cyan" size={20} />
            Payment Statistics
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Hash size={14} className="text-gray-500" />
                <p className="text-xs text-gray-500">Total Sessions</p>
              </div>
              <p className="text-2xl font-bold text-white font-mono">{stats.total_sessions}</p>
            </div>

            <div className="bg-emerald-500/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-emerald-400" />
                <p className="text-xs text-emerald-400">Paid Sessions</p>
              </div>
              <p className="text-2xl font-bold text-emerald-400 font-mono">{stats.paid_sessions}</p>
            </div>

            <div className="bg-neon-cyan/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-neon-cyan" />
                <p className="text-xs text-neon-cyan">Total Spent</p>
              </div>
              <p className="text-2xl font-bold text-neon-cyan font-mono">
                {stats.total_spent.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">{stats.currency}</p>
            </div>

            <div className="bg-purple-500/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-purple-400" />
                <p className="text-xs text-purple-400">Last Payment</p>
              </div>
              <p className="text-sm font-medium text-purple-300">
                {stats.last_payment_at
                  ? new Date(stats.last_payment_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Never'}
              </p>
            </div>
          </div>

          {/* Most Used Robot */}
          {stats.most_used_robot && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-400/10 rounded-lg">
                    <Award className="text-amber-400" size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Most Used Robot</p>
                    <p className="text-white font-semibold">{stats.most_used_robot.robot_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-400 font-mono">
                    {stats.most_used_robot.session_count}
                  </p>
                  <p className="text-xs text-gray-500">sessions</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/5 border border-white/10 rounded-xl p-6"
      >
        <h3 className="text-white font-bold text-lg mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={handleViewExplorer}
            className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm font-mono transition-all flex items-center justify-center gap-2"
          >
            <ExternalLink size={16} />
            View on Explorer
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-3 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/40 rounded-lg text-neon-cyan text-sm font-mono transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh Balances
          </button>
        </div>
      </motion.div>
    </div>
  );
}
