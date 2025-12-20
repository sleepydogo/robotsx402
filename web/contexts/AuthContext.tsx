'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/lib/api/auth';
import { apiClient } from '@/lib/api/client';
import { User } from '@/types/user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  walletLogin: (walletAddress: string, signature: string, message: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = authAPI.getStoredToken();
    const storedUser = authAPI.getStoredUser();

    if (token && storedUser) {
      apiClient.setToken(token);
      setUser(storedUser);
    }

    setLoading(false);
  }, []);

  const walletLogin = async (walletAddress: string, signature: string, message: string) => {
    try {
      const response = await authAPI.walletLogin({
        wallet_address: walletAddress,
        signature,
        message,
      });
      setUser(response.user);
    } catch (error: any) {
      console.error('Wallet login error:', error);
      throw new Error(error.response?.data?.detail || 'Wallet login failed');
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        walletLogin,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
