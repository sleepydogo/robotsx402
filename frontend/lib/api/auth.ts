import { apiClient } from './client';
import { User, TokenResponse, WalletLoginData } from '@/types/user';

export const authAPI = {
  async walletLogin(data: WalletLoginData): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/auth/wallet-login', data);
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    apiClient.setToken(response.data.access_token);
    return response.data;
  },

  async logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    apiClient.setToken(null);
  },

  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  },

  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};
