import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.getMe()
      .then(({ user }) => setUser(user))
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, [clearSession]);

  const login = useCallback(async (username, password) => {
    const { token, user } = await api.login({ username, password });
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (data) => {
    const { token, user } = await api.register(data);
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const updateProfile = useCallback(async (data) => {
    const { user: updated } = await api.updateMe(data);
    setUser(updated);
    return updated;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
