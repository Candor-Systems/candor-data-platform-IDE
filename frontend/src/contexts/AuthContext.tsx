import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { App } from 'antd';
import { api } from '../api/api';

interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  subscription_status: {
    has_subscription: boolean;
    is_expired: boolean;
    is_trial: boolean;
    days_remaining: number;
    trial_days_remaining: number;
    plan_type?: string;
    current_period_end?: string;
  };
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  isTrialActive: boolean;
  daysRemaining: number;
  trialDaysRemaining: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { message } = App.useApp();

  const isAuthenticated = !!user;
  const hasActiveSubscription = user?.subscription_status.has_subscription && !user?.subscription_status.is_expired;
  const isTrialActive = user?.subscription_status.is_trial && user?.subscription_status.trial_days_remaining > 0;
  const daysRemaining = user?.subscription_status.days_remaining || 0;
  const trialDaysRemaining = user?.subscription_status.trial_days_remaining || 0;

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.user) {
        setUser(response.data.user);
        // Store user ID as token for now (simple approach)
        localStorage.setItem('token', response.data.user.id.toString());
        message.success('Login successful!');
        return true;
      }
      return false;
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await api.post('/auth/register', userData);
      
      if (response.data.user) {
        setUser(response.data.user);
        localStorage.setItem('token', response.data.user.id.toString());
        message.success('Registration successful! Welcome to STTM.');
        return true;
      }
      return false;
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    message.success('Logged out successfully');
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setUser(response.data);
      }
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated,
    hasActiveSubscription,
    isTrialActive,
    daysRemaining,
    trialDaysRemaining,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
