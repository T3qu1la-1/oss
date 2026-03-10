import React, { useState } from 'react';
import { Send, ArrowLeft, ExternalLink, Loader } from 'lucide-react';
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
      const response = await axios.post(`${BACKEND_URL}/api/auth/telegram/login`, {
        telegram_id: telegramId,
        password
      });

      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      toast.success(`Bem-vindo, ${user.first_name}! 🚀`);

      setTimeout(() => {
        window.location.href = '/';
      }, 500);

    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao fazer login via Telegram';
      toast.error(`${errorMsg}`);
      setLoading(false);
    }
  };

  const openBot = () => {
    window.open('https://t.me/MarfinnoBot', '_blank');
    toast.info('Inicie conversa com /start para se registrar');
  };

  return (
    <div className="auth-minimal">
      <div className="auth-container-minimal" style={{ maxWidth: '460px' }}>
        <div className="auth-box">
          <button className="back-button" onClick={() => onNavigate('landing')}>
            <ArrowLeft size={18} />
            Voltar
          </button>

          <div className="auth-header-minimal">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{
                width: '56px', height: '56px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#3b82f6'
              }}>
                <Send size={24} />
              </div>
            </div>
            <h1 className="auth-title">Login via Telegram</h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Use seu Telegram ID e a senha cadastrada no bot
            </p>
          </div>

          <form className="auth-form-minimal" onSubmit={handleLogin}>
            <div className="input-group">
              <label>Telegram ID</label>
              <input
                type="text"
                placeholder="Ex: 123456789"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                disabled={loading}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Seu ID único do Telegram (somente números)
              </span>
            </div>

            <div className="input-group">
              <label>Senha</label>
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
              className="btn-minimal"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Entrando...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Entrar via Telegram
                </>
              )}
            </button>
          </form>

          <div style={{ margin: '1.5rem 0' }}>
            <div className="auth-divider">
              <span>Não tem conta?</span>
            </div>
          </div>

          <button className="auth-button-secondary" onClick={openBot}>
            <ExternalLink size={18} />
            Abrir @MarfinnoBot para Registrar
          </button>

          {/* How it works */}
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1.25rem', 
            background: 'var(--surface)', 
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line)'
          }}>
            <h4 style={{ 
              fontSize: '0.8125rem', 
              fontWeight: '600',
              marginBottom: '0.75rem',
              color: 'var(--text-secondary)'
            }}>
              Como funciona
            </h4>
            <ol style={{ 
              color: 'var(--text-muted)', 
              fontSize: '0.8125rem', 
              marginLeft: '1.25rem', 
              lineHeight: '1.8'
            }}>
              <li>Abra o bot <strong style={{ color: 'var(--text-secondary)' }}>@MarfinnoBot</strong> no Telegram</li>
              <li>Envie <code style={{ 
                background: 'var(--surface-hover)', 
                padding: '0.125rem 0.375rem', 
                borderRadius: '4px',
                fontSize: '0.75rem'
              }}>/start</code> para se registrar</li>
              <li>Escolha uma senha forte (mínimo 6 caracteres)</li>
              <li>Use seu <strong style={{ color: 'var(--text-secondary)' }}>Telegram ID</strong> + senha aqui</li>
              <li>Seu IP será registrado automaticamente</li>
            </ol>
          </div>

          <div className="auth-links" style={{ marginTop: '1.5rem' }}>
            <button onClick={() => onNavigate('login')}>
              Login com Email
            </button>
            <span style={{ color: 'var(--text-dim)' }}>|</span>
            <button onClick={() => onNavigate('register')}>
              Registrar com Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramLoginPage;
