'use client';
import React, { useState, useEffect } from 'react';
import { Activity, Clock, CheckCircle, XCircle, ExternalLink, Loader2, Filter, Calendar } from 'lucide-react';
import { getMySessions, SessionData } from '@/lib/api/payments';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function MySessions() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'expired'>('all');

  useEffect(() => {
    fetchSessions();
  }, [statusFilter]);

  const fetchSessions = async () => {
    setLoading(true);
    setError('');

    try {
      const filter = statusFilter === 'all' ? undefined : statusFilter;
      const data = await getMySessions(filter);
      setSessions(data.sessions);
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/20',
        icon: <CheckCircle size={14} />
      },
      pending: {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/20',
        icon: <Clock size={14} />
      },
      expired: {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/20',
        icon: <XCircle size={14} />
      }
    };

    const style = styles[status as keyof typeof styles] || styles.pending;

    return (
      <div className={`px-2 py-1 rounded text-xs font-mono border flex items-center gap-1.5 ${style.bg} ${style.text} ${style.border}`}>
        {style.icon}
        {status.toUpperCase()}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleViewTransaction = (txSignature: string) => {
    window.open(`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`, '_blank');
  };

  const handleNavigateToControl = (robotId: string) => {
    router.push(`/control/${robotId}`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">My Sessions</h2>
          <p className="text-gray-400 text-sm mt-1">Track your robot control sessions and payments</p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="text-gray-400" size={16} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-neon-cyan mb-4" size={48} />
          <p className="text-gray-400 font-mono">Loading sessions...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-red-500/20 rounded-xl bg-red-500/5">
          <XCircle className="text-red-400 mb-4" size={48} />
          <p className="text-red-400 font-mono">{error}</p>
          <button
            onClick={fetchSessions}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded text-red-300 text-sm transition-all"
          >
            Retry
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/5">
          <Activity className="text-gray-600 mb-4" size={48} />
          <p className="text-gray-400 font-mono">No sessions found.</p>
          <p className="text-gray-600 text-sm mt-2">Connect to a robot from the fleet to start.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/40 rounded text-neon-cyan text-sm font-mono transition-all"
          >
            Browse Robot Fleet
          </button>
        </div>
      ) : (
        <div className="space-y-4 pb-20">
          <AnimatePresence>
            {sessions.map((session, index) => (
              <motion.div
                key={session.session_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-neon-cyan/50 transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* Robot Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-black flex-shrink-0">
                    {session.robot_image_url ? (
                      <img
                        src={session.robot_image_url}
                        alt={session.robot_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                        <Activity className="text-gray-600" size={24} />
                      </div>
                    )}
                  </div>

                  {/* Session Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-lg truncate group-hover:text-neon-cyan transition-colors">
                          {session.robot_name}
                        </h3>
                        <p className="text-gray-400 text-sm font-mono">
                          Session ID: {session.session_id.substring(0, 8)}...
                        </p>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Amount</p>
                        <p className="text-white font-mono font-semibold">
                          {session.amount.toFixed(4)} {session.currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Service</p>
                        <p className="text-white text-sm capitalize">{session.service}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Created</p>
                        <p className="text-white text-sm flex items-center gap-1">
                          <Calendar size={12} className="text-gray-500" />
                          {formatDate(session.created_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Paid</p>
                        <p className="text-white text-sm">
                          {session.paid_at ? formatDate(session.paid_at) : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {session.status === 'paid' && (
                        <button
                          onClick={() => handleNavigateToControl(session.robot_id)}
                          className="px-3 py-1.5 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/40 rounded text-neon-cyan text-sm font-mono transition-all flex items-center gap-1.5"
                        >
                          <Activity size={14} />
                          Control Robot
                        </button>
                      )}
                      {session.tx_signature && (
                        <button
                          onClick={() => handleViewTransaction(session.tx_signature!)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-400 hover:text-white text-sm font-mono transition-all flex items-center gap-1.5"
                        >
                          <ExternalLink size={14} />
                          View Tx
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {sessions.length > 0 && (
            <div className="text-center text-gray-500 text-sm font-mono pt-4">
              Showing {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
