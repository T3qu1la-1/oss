import React, { useState } from 'react';
import { Send, ArrowLeft, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import './AuthPages.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const TelegramLoginPage = ({ onNavigate, onLoginSuccess }) => {
  const [telegramId, setTelegramId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!telegramId || !password) {
      toast.error('Preencha todos os campos!');
      return;
    }

    setLoading(true);

    try {
      // Obter IP do cliente (aproximado)
      const ipResponse = await axios.get('https://api.ipify.org?format=json');
      const ip_address = ipResponse.data.ip;

      const response = await axios.post(`${BACKEND_URL}/api/auth/telegram/login`, {
        telegram_id: telegramId,
        password,
        ip_address
      });

      const { access_token, user } = response.data;

      // Salvar token
      localStorage.setItem('token', access_token);

      toast.success(`Bem-vindo, ${user.first_name}! 🚀`);

      // Callback para App.js atualizar o estado
      if (onLoginSuccess) {
        onLoginSuccess(user);
      }

    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao fazer login via Telegram';
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const openBot = () => {
    window.open('https://t.me/MarfinnoBot', '_blank');
    toast.info('📱 Inicie conversa com /start para se registrar');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <button 
          className="back-button"
          onClick={() => onNavigate('landing')}
        >
          <ArrowLeft size={20} />
          Voltar
        </button>

        <div className="auth-header">
          <div className="logo-container">
            <Send size={48} color="#00bfff" />
          </div>
          <h1>Login via Telegram</h1>
          <p>Use seu Telegram ID e senha cadastrados no bot</p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label>🆔 Telegram ID</label>
            <input
              type="text"
              placeholder="Seu Telegram ID único"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              disabled={loading}
            />
            <small style={{ color: '#888', fontSize: '0.85rem' }}>
              Exemplo: 123456789
            </small>
          </div>

          <div className="form-group">
            <label>🔐 Senha</label>
            <input
              type="password"
              placeholder="Senha cadastrada no bot"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar via Telegram'}
          </button>
        </form>

        <div className="auth-divider">
          <span>Não tem conta?</span>
        </div>

        <button 
          className="auth-button-secondary"
          onClick={openBot}
        >
          <ExternalLink size={20} />
          Abrir @MarfinnoBot para Registrar
        </button>

        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          background: 'rgba(0, 191, 255, 0.1)', 
          borderRadius: '8px',
          borderLeft: '4px solid #00bfff'
        }}>
          <h3 style={{ color: '#00bfff', marginBottom: '0.5rem', fontSize: '1rem' }}>
            📱 Como funciona:
          </h3>
          <ol style={{ color: '#ccc', fontSize: '0.9rem', marginLeft: '1.5rem', lineHeight: '1.8' }}>
            <li>Abra o bot <strong>@MarfinnoBot</strong> no Telegram</li>
            <li>Envie <code>/start</code> para se registrar</li>
            <li>Escolha uma senha forte</li>
            <li>Use seu <strong>Telegram ID</strong> + senha aqui para fazer login</li>
            <li>Seu IP será registrado automaticamente</li>
          </ol>
        </div>

        <div className="auth-links">
          <button onClick={() => onNavigate('login')}>
            Login com Email
          </button>
          <button onClick={() => onNavigate('register')}>
            Registrar com Email
          </button>
        </div>
      </div>
    </div>
  );
};

export default TelegramLoginPage;
