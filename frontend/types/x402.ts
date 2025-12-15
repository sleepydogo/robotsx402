export interface X402Data {
  session_id: string;
  amount: number;
  currency: string;
  network: string;
  recipient: string;
  service: string;
  robot_id: string;
  expires_at: string;
  message?: string;
}

export interface X402Headers {
  'x-payment-required': string;
  'x-payment-amount': string;
  'x-payment-currency': string;
  'x-payment-network': string;
  'x-payment-address': string;
  'x-session-id': string;
  'x-payment-memo': string;
  'x-expires-at': string;
}
