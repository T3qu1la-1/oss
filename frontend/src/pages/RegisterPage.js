import React, { useState } from 'react';
import { ArrowRight, AlertCircle, Check, X, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const RegisterPage = ({ onNavigate }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (password) => {
    return {
      minLength: password.length >= 6,
      hasNumber: /\d/.test(password),
      hasLetter: /[a-zA-Z]/.test(password)
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    const result = await register(formData.username, formData.email, formData.password);
    
    if (result.success) {
      onNavigate('dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const validation = validatePassword(formData.password);

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
            <h1 className="auth-title">Criar Conta</h1>
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
              <label>Nome de Usuário</label>
              <input 
                type="text" 
                placeholder="seu_username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
                autoComplete="username"
              />
            </div>

            <div className="input-group">
              <label>Email</label>
              <input 
                type="email" 
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label>Senha</label>
              <input 
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                autoComplete="new-password"
              />
              {formData.password && (
                <div className="password-checks">
                  <div className={`check-item ${validation.minLength ? 'valid' : 'invalid'}`}>
                    {validation.minLength ? <Check size={14} /> : <X size={14} />}
                    <span>Mínimo 6 caracteres</span>
                  </div>
                  <div className={`check-item ${validation.hasLetter ? 'valid' : 'invalid'}`}>
                    {validation.hasLetter ? <Check size={14} /> : <X size={14} />}
                    <span>Contém letra</span>
                  </div>
                  <div className={`check-item ${validation.hasNumber ? 'valid' : 'invalid'}`}>
                    {validation.hasNumber ? <Check size={14} /> : <X size={14} />}
                    <span>Contém número</span>
                  </div>
                </div>
              )}
            </div>

            <button 
              type="submit"
              className="btn-minimal"
              disabled={loading}
            >
              {loading ? 'Criando conta...' : (
                <>
                  Criar Conta <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer-minimal">
            <p>
              Já tem conta?{' '}
              <button onClick={() => onNavigate('login')} className="link-minimal">
                Entrar
              </button>
            </p>
            <button onClick={() => onNavigate('landing')} className="link-minimal">
              ← Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
