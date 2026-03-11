import React, { useState } from 'react';
import axios from 'axios';
import { Target, Search, Shield, Globe, Lock, Unlock, Zap, Server } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './CookieCatcher.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CookieCatcher = () => {
  const { token } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCapture = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Você precisa estar logado para usar esta ferramenta.');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/tools/extract-cookies`, { url }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao capturar cookies da URL fornecida.');
    } finally {
      setLoading(false);
    }
  };

  const getSecurityProps = (cookie) => {
    const props = [];
    if (cookie.secure) props.push(<span key="sec" className="badge secure"><Lock size={12}/> Secure</span>);
    if (!cookie.secure) props.push(<span key="usec" className="badge insecure"><Unlock size={12}/> Insecure</span>);
    if (cookie.httponly) props.push(<span key="http" className="badge httponly"><Shield size={12}/> HttpOnly</span>);
    if (cookie.samesite) props.push(<span key="samesite" className="badge samesite">SameSite={cookie.samesite}</span>);
    return props;
  };

  return (
    <div className="cookie-catcher-page page-container">
      <header className="page-header">
        <h1>
          <Target size={32} />
          CAPTURA DE COOKIES & HEADERS
        </h1>
        <p>Inspecione sessões, detecte falhas de segurança em cookies e extraia cabeçalhos críticos em segundos.</p>
      </header>

      <div className="tool-card">
        <form onSubmit={handleCapture}>
          <div className="input-group dark-input">
            <Globe size={20} />
            <input
              type="url"
              placeholder="https://alvo.exemplo.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'CAPTURANDO...' : <><Search size={18} /> INSPECIONAR</>}
            </button>
          </div>
        </form>
        {error && <div className="error-message">{error}</div>}
      </div>

      {result && (
        <div className="results-container fade-in">
          
          <div className="summary-cards">
            <div className="summary-card">
               <Shield size={24} className="icon-blue" />
               <div className="info">
                 <span className="label">Total de Cookies</span>
                 <span className="value">{result.cookies.length}</span>
               </div>
            </div>
            <div className="summary-card">
               <Server size={24} className="icon-green" />
               <div className="info">
                 <span className="label">Servidor / Status</span>
                 <span className="value">{result.server} - HTTP {result.status_code}</span>
               </div>
            </div>
          </div>

          <div className="two-columns">
             <div className="result-panel cookies-panel">
               <h3 className="panel-title"><Lock size={18}/> Cookies Extraídos</h3>
               {result.cookies.length === 0 ? (
                 <p className="no-data">Nenhum cookie definido por este servidor.</p>
               ) : (
                 <div className="cookie-list">
                   {result.cookies.map((c, i) => (
                      <div key={i} className="cookie-item">
                        <div className="cookie-header">
                          <strong>{c.name}</strong>
                          <div className="cookie-badges">
                            {getSecurityProps(c)}
                          </div>
                        </div>
                        <div className="cookie-value">
                          <span>Valor:</span>
                          <code>{c.value.length > 80 ? c.value.substring(0,80) + '...' : c.value}</code>
                        </div>
                        {c.domain && <div className="cookie-meta">Domínio: {c.domain}</div>}
                        {c.expires && <div className="cookie-meta">Expira em: {c.expires}</div>}
                      </div>
                   ))}
                 </div>
               )}
             </div>

             <div className="result-panel headers-panel">
               <h3 className="panel-title"><Zap size={18}/> Cabeçalhos Relevantes</h3>
               <div className="headers-list">
                 {Object.entries(result.headers).map(([key, val], idx) => (
                   <div key={idx} className="header-item">
                      <span className="header-key">{key}:</span>
                      <span className="header-value">{val}</span>
                   </div>
                 ))}
               </div>
             </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default CookieCatcher;
