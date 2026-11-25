import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, usageService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('drive_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('drive_token') || null);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(null);

  const refreshUser = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await authService.getMe();
      setUser(data.user);
      localStorage.setItem('drive_user', JSON.stringify(data.user));

      const usageData = await usageService.getUsage();
      setUsage(usageData);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleLogout = () => logout();
    window.addEventListener('auth_logout', handleLogout);
    return () => window.removeEventListener('auth_logout', handleLogout);
  }, [token]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('drive_token', data.token);
    localStorage.setItem('drive_user', JSON.stringify(data.user));
    await refreshUser();
    return data;
  };

  const register = async (email, password, fullName) => {
    const data = await authService.register(email, password, fullName);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('drive_token', data.token);
    localStorage.setItem('drive_user', JSON.stringify(data.user));
    await refreshUser();
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setUsage(null);
    localStorage.removeItem('drive_token');
    localStorage.removeItem('drive_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        usage,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

