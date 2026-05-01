import React, { createContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser } from '../services/api';

export const AuthContext = createContext({
  user: null,
  role: null,
  loading: true,
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    setLoading(true);

    try {
      const response = await getCurrentUser();
      setUser(response.data);
      setRole(response.data.profile?.role || null);
    } catch (err) {
      setUser(null);
      setRole(null);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const value = useMemo(
    () => ({ user, role, loading, refreshUser }),
    [user, role, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
