import { apiClient } from './client';

export interface PaymentSession {
  id: string;
  user_id: string;
  robot_id: string;
  amount: number;
  currency: string;
  recipient_address: string;
  status: 'pending' | 'paid' | 'expired';
  tx_signature?: string;
  service_payload?: any;
  created_at: string;
  expires_at: string;
  paid_at?: string;
}

export interface PaymentVerificationRequest {
  session_id: string;
  tx_signature: string;
}

export interface PaymentVerificationResponse {
  verified: boolean;
  session_id: string;
  error?: string;
}

/**
 * Verify a payment transaction on the blockchain
 */
export async function verifyPayment(
  sessionId: string,
  txSignature: string
): Promise<PaymentVerificationResponse> {
  const response = await apiClient.post<PaymentVerificationResponse>('/payments/verify', {
    session_id: sessionId,
    tx_signature: txSignature,
  });
  return response.data;
}

/**
 * Get payment session status
 */
export async function getSessionStatus(sessionId: string): Promise<PaymentSession> {
  const response = await apiClient.get<PaymentSession>(`/payments/session/${sessionId}`);
  return response.data;
}

/**
 * Create a new payment session for a robot
 */
export async function createPaymentSession(
  robotId: string,
  service: string = 'control',
  rentalPlanIndex?: number
): Promise<PaymentSession> {
  const response = await apiClient.post<PaymentSession>('/execute/' + robotId, {
    service: service,
    parameters: {},
    rental_plan_index: rentalPlanIndex,
  });
  return response.data;
}

export interface SessionData {
  session_id: string;
  robot_id: string;
  robot_name: string;
  robot_image_url?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'expired';
  tx_signature?: string;
  created_at: string;
  expires_at: string;
  paid_at?: string;
  service: string;
}

export interface MySessionsResponse {
  sessions: SessionData[];
  total: number;
}

/**
 * Get all sessions for the current user
 */
export async function getMySessions(status?: string): Promise<MySessionsResponse> {
  const params = status ? { status } : {};
  const response = await apiClient.get<MySessionsResponse>('/payments/sessions/my', { params });
  return response.data;
}

export interface PaymentStats {
  total_sessions: number;
  paid_sessions: number;
  pending_sessions: number;
  total_spent: number;
  currency: string;
  last_payment_at?: string;
  most_used_robot?: {
    robot_id: string;
    robot_name: string;
    session_count: number;
  };
}

/**
 * Get payment statistics for the current user
 */
export async function getMyPaymentStats(): Promise<PaymentStats> {
  const response = await apiClient.get<PaymentStats>('/payments/stats/my');
  return response.data;
}
