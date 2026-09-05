import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../../api/client';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth lazima itumike ndani ya AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('kataviUser');
      const savedToken = localStorage.getItem('kataviToken');

      if (savedUser && savedToken) {
        try {
          const res = await authAPI.getMe();
          setUser(res.data);
          localStorage.setItem('kataviUser', JSON.stringify(res.data));
        } catch {
          localStorage.removeItem('kataviUser');
          localStorage.removeItem('kataviToken');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const userData = res.data;
    localStorage.setItem('kataviUser', JSON.stringify(userData));
    localStorage.setItem('kataviToken', userData.token);
    setUser(userData);
    return userData;
  };

  const loginWithUser = (userData) => {
    localStorage.setItem('kataviUser', JSON.stringify(userData));
    localStorage.setItem('kataviToken', userData.token);
    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    const userData = res.data;
    localStorage.setItem('kataviUser', JSON.stringify(userData));
    localStorage.setItem('kataviToken', userData.token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('kataviUser');
    localStorage.removeItem('kataviToken');
    setUser(null);
  };

  const updateUser = (newData) => {
    const updated = { ...user, ...newData };
    setUser(updated);
    localStorage.setItem('kataviUser', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithUser, register, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
