import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      if (token) {
        // Se é admin, restaurar do localStorage sem chamar /me
        const savedRole = localStorage.getItem('user_role');
        const savedEmail = localStorage.getItem('user_email');
        const savedUsername = localStorage.getItem('user_username');
        if (savedRole === 'admin') {
          setUser({ username: savedUsername || 'Admin', email: savedEmail || '', role: 'admin' });
          setLoading(false);
          return;
        }

        try {
          const response = await axios.get(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error('Error loading user:', error);
          // Only force logout on genuine 401 Unauthorized token failures
          if (error.response && error.response.status === 401) {
             logout();
          } else {
             // Backend might be restarting or rate limited. 
             // We won't clear localStorage token here, but we set user to null so they can wait/retry.
             setUser(null);
          }
        }
      }
      setLoading(false);
    };
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (email, password) => {
    try {
      // Tentar login admin primeiro
      try {
        const adminRes = await axios.post(`${API_URL}/api/admin/login`, { email, password });
        const { access_token, username, role } = adminRes.data;
        localStorage.setItem('token', access_token);
        localStorage.setItem('user_role', role);
        localStorage.setItem('user_email', email);
        localStorage.setItem('user_username', username);
        setToken(access_token);
        setUser({ username, email, role });
        toast.success(`Bem-vindo, Admin ${username}! 👑`);
        return { success: true };
      } catch (adminErr) {
        // Não é admin, tentar login regular
      }

      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_username');
      setToken(access_token);
      setUser(userData);
      toast.success(`Bem-vindo de volta, ${userData.username}! 🎉`);
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao fazer login';
      toast.error(`❌ ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, { username, email, password });
      const { access_token, user: userData } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      toast.success(`Conta criada com sucesso! Bem-vindo, ${userData.username}! 🚀`);
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao registrar';
      toast.error(`❌ ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_username');
    setToken(null);
    setUser(null);
    toast.info('Logout realizado com sucesso. Até logo! 👋');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);