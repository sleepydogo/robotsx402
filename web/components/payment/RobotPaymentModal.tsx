'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Loader2, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { createRobotPaymentTransaction } from '@/lib/blockchain/robotPayment';
import { verifyPayment, createPaymentSession } from '@/lib/api/payments';

interface RentalPlan {
  duration_minutes: number;
  price: number;
  name?: string;
}

interface Robot {
  id: string;
  name: string;
  price: number;
  currency: string;
  image_url?: string;
  wallet_address: string;
  rental_plans?: RentalPlan[];
}

interface RobotPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  robot: Robot;
  onPaymentSuccess: (signature: string) => void;
}

export const RobotPaymentModal: React.FC<RobotPaymentModalProps> = ({
  isOpen,
  onClose,
  robot,
  onPaymentSuccess
}) => {
  const { publicKey, sendTransaction, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [signature, setSignature] = useState('');
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Get rental plans or create default
  const rentalPlans = robot.rental_plans && robot.rental_plans.length > 0
    ? robot.rental_plans
    : [{ duration_minutes: 10, price: robot.price * 600, name: '10 minutes' }];

  const selectedPlan = rentalPlans[selectedPlanIndex];
  const sessionPrice = selectedPlan.price;
  const sessionDuration = selectedPlan.duration_minutes;

  const createSession = async () => {
    try {
      // Call backend to create payment session (will return 402)
      const response = await createPaymentSession(robot.id, 'control', selectedPlanIndex);

      // Extract session_id from response
      if (response && (response as any).session_id) {
        return (response as any).session_id;
      } else {
        throw new Error('Failed to create session: No session ID returned');
      }
    } catch (err: any) {
      console.error('Session creation error:', err);

      // Check if it's a 402 response (expected)
      if (err.response?.status === 402) {
        const sessionIdFromHeaders = err.response.headers['x-session-id'];
        if (sessionIdFromHeaders) {
          return sessionIdFromHeaders;
        } else {
          throw new Error('Failed to create payment session: No session ID in response');
        }
      } else {
        throw new Error(err.message || 'Failed to create payment session');
      }
    }
  };

  const handlePayment = async () => {
    if (!publicKey || !connected) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Create payment session
      const newSessionId = await createSession();
      setSessionId(newSessionId);

      // Step 2: Create payment transaction
      const txSignature = await createRobotPaymentTransaction({
        payer: publicKey,
        recipient: robot.wallet_address,
        amount: sessionPrice,
        robotId: robot.id,
        sendTransaction
      });

      setSignature(txSignature);

      // Step 3: Verify payment on backend
      setVerifying(true);
      const verificationResult = await verifyPayment(newSessionId, txSignature);

      if (!verificationResult.verified) {
        throw new Error(verificationResult.error || 'Payment verification failed');
      }

      setSuccess(true);

      // Wait a moment before calling success callback
      setTimeout(() => {
        onPaymentSuccess(txSignature);
      }, 1500);

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to process payment. Please try again.');
      setSignature('');
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  const handleClose = () => {
    if (!loading && !verifying) {
      setError('');
      setSuccess(false);
      setSignature('');
      setSessionId(null);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 border border-white/10 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col my-8"
            >
              {/* Header */}
              <div className="relative p-6 border-b border-white/10 flex-shrink-0">
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors disabled:opacity-50"
                >
                  <X size={24} />
                </button>

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-neon-cyan/10 rounded-lg">
                    <Zap className="text-neon-cyan" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Start Control Session</h2>
                    <p className="text-sm text-gray-400">Payment required to access robot</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Robot Info */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4">
                  {robot.image_url && (
                    <img
                      src={robot.image_url}
                      alt={robot.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{robot.name}</h3>
                    <p className="text-sm text-gray-400">
                      {rentalPlans.length} plan{rentalPlans.length > 1 ? 's' : ''} available
                    </p>
                  </div>
                </div>

                {/* Plan Selection */}
                {rentalPlans.length > 1 && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-white">Select Plan</label>
                    <div className="grid grid-cols-1 gap-2">
                      {rentalPlans.map((plan, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedPlanIndex(index)}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            selectedPlanIndex === index
                              ? 'border-neon-cyan bg-neon-cyan/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-white font-semibold">
                                {plan.name || `${plan.duration_minutes} minutes`}
                              </div>
                              <div className="text-xs text-gray-400">
                                {plan.duration_minutes} min • {(plan.price / plan.duration_minutes).toFixed(4)} {robot.currency}/min
                              </div>
                            </div>
                            <div className="text-neon-cyan font-bold font-mono">
                              {plan.price.toFixed(2)} {robot.currency}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Session Details */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Session Duration</span>
                    <span className="text-white font-mono">{sessionDuration} minutes</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Plan</span>
                    <span className="text-white font-mono">{selectedPlan.name || `${sessionDuration} min`}</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between">
                    <span className="text-white font-semibold">Total Amount</span>
                    <span className="text-neon-cyan font-bold font-mono text-lg">
                      {sessionPrice.toFixed(4)} {robot.currency}
                    </span>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-blue-200">
                    This payment grants you <strong>{sessionDuration} minutes</strong> of exclusive control over {robot.name}.
                    The session will automatically end when time expires.
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="text-sm text-green-200 mb-2">Payment successful! Starting control session...</p>
                      {signature && (
                        <a
                          href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-300 hover:text-green-200 underline font-mono break-all"
                        >
                          View transaction
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Wallet Connection / Payment Button */}
                {!connected ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-400 text-center">
                      Connect your wallet to continue
                    </p>
                    <div className="flex justify-center">
                      <WalletMultiButton className="!bg-neon-cyan !text-cyber-black hover:!bg-white !rounded-lg !font-bold !transition-all" />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handlePayment}
                    disabled={loading || verifying || success}
                    className="w-full bg-neon-cyan text-cyber-black font-bold py-4 rounded-lg hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading || verifying ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        {verifying ? 'Verifying Payment...' : 'Processing Payment...'}
                      </>
                    ) : success ? (
                      <>
                        <CheckCircle size={20} />
                        Payment Complete
                      </>
                    ) : (
                      <>
                        <Wallet size={20} />
                        Pay {sessionPrice.toFixed(4)} {robot.currency}
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
