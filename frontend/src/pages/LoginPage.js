import React, { useState, useEffect } from 'react';
import { ArrowRight, AlertCircle, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const LoginPage = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Anti-DDoS UA State (shows the "bag.html" element)
  const [checkingUA, setCheckingUA] = useState(true);

  useEffect(() => {
    // Load the Visme script dinamically for the Anti-DDoS
    const script = document.createElement('script');
    script.src = "https://static-bundles.visme.co/forms/vismeforms-embed.js";
    script.async = true;
    document.body.appendChild(script);

    // Simulate the UA checking process for 4s before showing login page
    const timer = setTimeout(() => {
      setCheckingUA(false);
    }, 4000); 

    return () => {
      clearTimeout(timer);
      // We do not remove the script here to prevent the external Visme code from crashing
      // when it tries to access elements or complete network requests after React unmounts it.
    };
  }, []);

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
    <>
      {/* The Anti-DDoS Screen (Black Background, Visme Embed) */}
      <div style={{ 
        margin: 0, 
        height: '100vh', 
        width: '100vw',
        display: checkingUA ? 'flex' : 'none', 
        justifyContent: 'center', 
        alignItems: 'center', 
        background: '#000000', // FUNDO PRETO
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}>
        <div style={{ textAlign: 'center', width: '100%' }}>
          <p style={{ color: '#00ff41', fontFamily: 'monospace', marginBottom: '20px', fontSize: '1.2rem', textShadow: '0 0 5px #00ff41' }}>
            🔍 Validating User-Agent... Anti-DDoS Protection
          </p>
          {/* Visme Embed form from bag.html */}
          <div className="visme_d" 
              data-title="Webinar Registration Form" 
              data-url="g7ddqxx0-untitled-project?fullPage=true" 
              data-domain="forms" 
              data-full-page="true" 
              data-min-height="50vh" 
              data-form-id="133190">
          </div>
        </div>
      </div>

      {/* The Regular Login Screen */}
      <div className="auth-minimal" style={{ display: checkingUA ? 'none' : 'flex' }}>
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
    </>
  );
};

export default LoginPage;
