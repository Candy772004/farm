import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { IUser, UserRole } from '../types';

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchDemoUser: (role: UserRole, userEmail?: string) => Promise<void>;
  isCustomer: boolean;
  isFarmer: boolean;
  isAdmin: boolean;
  isFarmerApproved: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success) {
        if (res.data.token) {
          localStorage.setItem('f2t_token', res.data.token);
        }
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Login failed.' };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || 'Invalid email or password.' };
    }
  };

  const register = async (data: any) => {
    try {
      const res = await api.post('/auth/register', data);
      if (res.data?.success) {
        if (res.data.token) {
          localStorage.setItem('f2t_token', res.data.token);
        }
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Registration failed.' };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || 'Registration failed.' };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Continue client cleanup
    } finally {
      localStorage.removeItem('f2t_token');
      setUser(null);
    }
  };

  const switchDemoUser = async (role: UserRole, userEmail?: string) => {
    try {
      setLoading(true);
      const res = await api.post('/auth/demo-switch', { role, userEmail });
      if (res.data?.success) {
        if (res.data.token) {
          localStorage.setItem('f2t_token', res.data.token);
        }
        setUser(res.data.user);
      }
    } catch (err) {
      console.error('Failed to switch demo user:', err);
    } finally {
      setLoading(false);
    }
  };

  const isCustomer = user?.role === 'customer';
  const isFarmer = user?.role === 'farmer';
  const isAdmin = user?.role === 'admin';
  const isFarmerApproved = isFarmer && user?.farmerProfile?.verificationStatus === 'approved';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        switchDemoUser,
        isCustomer,
        isFarmer,
        isAdmin,
        isFarmerApproved
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
