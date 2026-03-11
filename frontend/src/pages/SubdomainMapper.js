import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Globe, Search, Database, Fingerprint, ExternalLink, Network } from 'lucide-react';
import './SubdomainMapper.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SubdomainMapper = () => {
  const { token } = useAuth();
  const [domain, setDomain] = useState('');
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

    if (!domain || !domain.trim()) {
      setError('Domínio alvo é obrigatório no frontend.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/tools/subdomain-mapper`, { domain }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao realizar o mapeamento de subdomínios.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subdomain-mapper-page page-container">
      <header className="page-header">
        <h1>
          <Globe size={32} />
          SUBDOMAIN MAPPER
        </h1>
        <p>Enumeração passiva avançada de subdomínios via Certificate Transparency (crt.sh) e DNS Resolution.</p>
      </header>

      <div className="tool-card">
        <form onSubmit={handleScan}>
          <div className="input-group dark-input">
            <Search size={20} />
            <input
              type="text"
              placeholder="Domínio principal (ex: exemplo.com.br)"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'MAPEANDO...' : 'MAPEAR INFRA'}
            </button>
          </div>
        </form>
        {error && <div className="error-message">{error}</div>}
      </div>

      {loading && (
        <div className="scanning-indicator fade-in">
          <Database size={48} className="pulse-icon" />
          <p>Consultando banco de dados de transparência de certificados globais...</p>
        </div>
      )}

      {result && (
        <div className="mapper-results fade-in">
          <div className="summary-dashboard">
            <div className="summary-stat">
              <span className="stat-label">Domínio Analisado</span>
              <span className="stat-value text-primary">{result.domain}</span>
            </div>
            <div className="summary-stat highlighted">
              <span className="stat-label">Subdomínios Descobertos</span>
              <span className="stat-value">{result.total_found}</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">IPs Resolvidos</span>
              <span className="stat-value text-success">
                {result.subdomains.filter(s => s.resolved).length}
              </span>
            </div>
          </div>

          <div className="results-panel">
            <h3><Network size={20}/> Infraestrutura Mapeada</h3>
            {result.subdomains.length === 0 ? (
              <div className="no-findings">
                <Globe size={48} className="icon-orange" />
                <p>Nenhum subdomínio encontrado para este domínio na base de certificados.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Subdomínio</th>
                      <th>Endereço IPv4</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.subdomains.map((item, i) => (
                      <tr key={i}>
                        <td>
                          {item.resolved ? (
                            <span className="status-badge status-success">Ativo</span>
                          ) : (
                            <span className="status-badge status-error">Inativo/Oculto</span>
                          )}
                        </td>
                        <td className="subdomain-name">{item.subdomain}</td>
                        <td className="ip-address">{item.ip}</td>
                        <td>
                          <a href={`http://${item.subdomain}`} target="_blank" rel="noopener noreferrer" className="action-btn">
                            Visitar <ExternalLink size={14} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {result.total_found > 50 && (
              <div className="info-banner">
                <Fingerprint size={18} />
                <span>Mostrando todos os {result.total_found} subdomínios, porém a resolução DNS foi feita apenas para os 50 primeiros por limites de segurança.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubdomainMapper;
