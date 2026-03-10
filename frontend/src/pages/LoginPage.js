import React, { useState } from 'react';
import { ArrowRight, AlertCircle, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const LoginPage = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      onNavigate('dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-minimal">
      <div className="auth-container-minimal">
        <div className="auth-box">
          <div className="auth-header-minimal">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{
                width: '48px', height: '48px',
                borderRadius: '50%',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Eye size={22} />
              </div>
            </div>
            <h1 className="auth-title">Entrar</h1>
            <div className="title-underline"></div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form-minimal">
            {error && (
              <div className="error-box">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="input-group">
              <label>Email</label>
              <input 
                type="email" 
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label>Senha</label>
              <input 
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button 
              type="submit"
              className="btn-minimal"
              disabled={loading}
            >
              {loading ? 'Entrando...' : (
                <>
                  Entrar <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer-minimal">
            <p>
              Não tem conta?{' '}
              <button onClick={() => onNavigate('register')} className="link-minimal">
                Criar conta
              </button>
            </p>
            <button onClick={() => onNavigate('telegram-login')} className="link-minimal">
              Entrar via Telegram
            </button>
            <button onClick={() => onNavigate('landing')} className="link-minimal">
              ← Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
