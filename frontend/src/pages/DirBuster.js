import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FolderSearch, Search, AlertCircle, FileText, CheckCircle, ExternalLink, Activity } from 'lucide-react';
import './DirBuster.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const DirBuster = () => {
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

    if (!url || !url.trim()) {
      setError('URL alvo é obrigatória no frontend.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/tools/dir-buster`, { url }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao realizar a busca de diretórios.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    if (status >= 200 && status < 300) return 'status-success';
    if (status >= 300 && status < 400) return 'status-redirect';
    return 'status-error';
  };

  return (
    <div className="dir-buster-page page-container">
      <header className="page-header">
        <h1>
          <FolderSearch size={32} />
          DIRBUSTER WEB
        </h1>
        <p>Fuzzer ultrarrápido para descobertas de arquivos confidenciais ocultos, lixos de deploy e credenciais expostas em produção.</p>
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
              {loading ? 'BRUTE-FORCING...' : 'INICIAR FUZZING'}
            </button>
          </div>
        </form>
        {error && <div className="error-message">{error}</div>}
      </div>

      {loading && (
        <div className="scanning-indicator fade-in">
          <Activity size={48} className="pulse-icon" />
          <p>Enviando payloads e testando paths assincronamente...</p>
        </div>
      )}

      {result && (
        <div className="dir-buster-results fade-in">
          <div className="summary-dashboard">
            <div className="summary-stat">
              <span className="stat-label">Paths Testados</span>
              <span className="stat-value">{result.total_tested}</span>
            </div>
            <div className="summary-stat highlighted">
              <span className="stat-label">Arquivos/Diretórios Expostos</span>
              <span className="stat-value text-danger">{result.found_count}</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Críticos (Risco Máximo)</span>
              <span className="stat-value text-warning">
                {result.results.filter(r => r.critical).length}
              </span>
            </div>
          </div>

          <div className="results-panel">
            <h3>Resultados Encontrados</h3>
            {result.results.length === 0 ? (
              <div className="no-findings">
                <CheckCircle size={48} className="icon-success" />
                <p>Nenhum arquivo listado ou diretório arriscado foi encontrado exposto. O servidor parece estar configurado corretamente para ocultá-los.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Path</th>
                      <th>Tamanho</th>
                      <th>Tipo MIME</th>
                      <th>Severidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((item, i) => (
                      <tr key={i} className={item.critical ? 'row-critical' : ''}>
                        <td>
                          <span className={`status-badge ${getStatusClass(item.status)}`}>
                            HTTP {item.status}
                          </span>
                        </td>
                        <td>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="path-link">
                            {item.path} <ExternalLink size={12} />
                          </a>
                        </td>
                        <td>{item.size > 0 ? `${(item.size / 1024).toFixed(1)} KB` : '-'}</td>
                        <td className="mime-type">{item.type || 'Desconhecido / Binário'}</td>
                        <td>
                          {item.critical ? (
                            <span className="badge true"><AlertCircle size={14}/> Crítico</span>
                          ) : (
                            <span className="badge false"><FileText size={14}/> Info</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DirBuster;
