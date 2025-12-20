export interface PaymentVerification {
  session_id: string;
  tx_signature: string;
}

export interface PaymentVerificationResponse {
  verified: boolean;
  session_id: string;
  error?: string;
}

export interface ExecutePayload {
  service: string;
  parameters: Record<string, any>;
}

export interface ExecuteResponse {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  execution_time?: number;
}
