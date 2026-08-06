import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vp_user')) || null;
    } catch {
      return null;
    }
  });
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vp_token');
    if (!token) {
      setInitializing(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('vp_user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        localStorage.removeItem('vp_token');
        localStorage.removeItem('vp_user');
      })
      .finally(() => setInitializing(false));
  }, []);

  const login = useCallback(async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password });
    localStorage.setItem('vp_token', res.data.token);
    localStorage.setItem('vp_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('vp_token');
    localStorage.removeItem('vp_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, initializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
