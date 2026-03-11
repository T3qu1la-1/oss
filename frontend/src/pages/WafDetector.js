import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Shield, ShieldAlert, ShieldCheck, Search, Server, Activity, AlertTriangle, Info } from 'lucide-react';
import './WafDetector.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const WafDetector = () => {
  const { token } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleScan = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Acesso negado.');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/tools/waf-detector`, { url }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao realizar a detecção de WAF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="waf-detector-page page-container">
      <header className="page-header">
        <h1>
          <ShieldAlert size={32} />
          WAF DETECTOR
        </h1>
        <p>Identifique e analise sistemas de proteção (Web Application Firewalls) em aplicações web.</p>
      </header>

      <div className="tool-card">
        <form onSubmit={handleScan}>
          <div className="input-group dark-input">
            <Search size={20} />
            <input
              type="url"
              placeholder="https://alvo.exemplo.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'ANALISANDO...' : 'DETECTAR WAF'}
            </button>
          </div>
        </form>
        {error && <div className="error-message">{error}</div>}
      </div>

      {result && (
        <div className="waf-results fade-in">
          <div className={`waf-status-card ${result.has_waf ? 'waf-detected' : 'waf-clear'}`}>
            <div className="status-icon">
              {result.has_waf ? <ShieldAlert size={64} /> : <ShieldCheck size={64} />}
            </div>
            <div className="status-info">
              <h2>{result.has_waf ? 'WAF DETECTADO' : 'NENHUM WAF DETECTADO'}</h2>
              <h3 className="waf-name">{result.waf_name}</h3>
              <div className="confidence-meter">
                <div className="meter-label">
                  <span>Confiança da Detecção</span>
                  <span>{result.confidence}%</span>
                </div>
                <div className="meter-bar">
                  <div className="meter-fill" style={{ width: `${result.confidence}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="waf-details-grid">
            <div className="detail-card">
              <div className="card-header">
                <Server size={20} />
                <h3>Server Header Base</h3>
              </div>
              <div className="card-body">
                <code>{result.server_header || 'N/A'}</code>
              </div>
            </div>

            <div className="detail-card">
              <div className="card-header">
                <Activity size={20} />
                <h3>Análise Comportamental</h3>
              </div>
              <div className="card-body">
                <div className="status-row">
                  <span>Requisição Normal:</span>
                  <span className={`status-badge status-${result.normal_status}`}>{result.normal_status}</span>
                </div>
                <div className="status-row">
                  <span>Requisição Maliciosa:</span>
                  <span className={`status-badge status-${result.malicious_status}`}>{result.malicious_status === 0 ? 'DROP' : result.malicious_status}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="waf-logs">
            <h3><Info size={20}/> Detalhes da Análise</h3>
            <ul className="log-list">
              {result.details.map((detail, index) => (
                <li key={index}><AlertTriangle size={16}/> {detail}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default WafDetector;
