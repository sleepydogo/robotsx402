export interface User {
  id: string;
  email: string;
  role: 'user' | 'robot_owner' | 'admin';
  wallet_address?: string;
  total_spent: number;
  created_at: string;
}

export interface WalletLoginData {
  wallet_address: string;
  signature: string;
  message: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}
