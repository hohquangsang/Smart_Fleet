import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage and fetch fresh profile from API on mount
  useEffect(() => {
    const initAuth = async () => {
      const stored = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');

      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          localStorage.clear();
        }
      }

      if (token) {
        try {
          const { data } = await api.get('/users/me');
          const userData = data?.data?.user || data?.data;
          if (userData) {
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } catch (err) {
          if (err.response?.status === 401) {
            localStorage.clear();
            setUser(null);
          }
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });

    const userData = data.data.user;
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await api.post('/auth/register', formData);

    const userData = data.data.user;
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
  }, []);

  const updateUser = useCallback((userData) => {
    setUser((prev) => {
      const merged = { ...prev, ...userData };
      if (userData.driver && prev?.driver) {
        merged.driver = { ...prev.driver, ...userData.driver };
      }
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isDriver: user?.role === 'DRIVER',
    isCustomer: user?.role === 'CUSTOMER',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
