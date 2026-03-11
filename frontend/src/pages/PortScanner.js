import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Network, Search, Server, ShieldAlert, Activity, Terminal } from 'lucide-react';
import './PortScanner.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const PortScanner = () => {
  const { token } = useAuth();
  const [target, setTarget] = useState('');
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

    if (!target || !target.trim()) {
      setError('Alvo (IP ou Domínio) é obrigatório no frontend.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/tools/port-scanner`, { target }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao realizar o scan de portas.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverity = (port) => {
    const critical = [21, 22, 23, 445, 3306, 3389, 5432, 27017, 6379, 11211, 9200];
    const high = [80, 8080, 8000, 8888];
    if (critical.includes(port)) return 'critical';
    if (high.includes(port)) return 'high';
    return 'medium';
  };

  return (
    <div className="port-scanner-page page-container">
      <header className="page-header">
        <h1>
          <Network size={32} />
          PORT SCANNER
        </h1>
        <p>Scanner assíncrono TCP super-rápido para descobrir portas expostas e capturar banners de serviços.</p>
      </header>

      <div className="tool-card">
        <form onSubmit={handleScan}>
          <div className="input-group dark-input">
            <Search size={20} />
            <input
              type="text"
              placeholder="IP ou Domínio alvo (ex: 192.168.1.1 ou site.com)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'SCANEANDO...' : 'INICIAR SCAN'}
            </button>
          </div>
        </form>
        {error && <div className="error-message">{error}</div>}
      </div>

      {loading && (
        <div className="scanning-radar fade-in">
          <div className="radar">
            <div className="sweep"></div>
          </div>
          <p>Disparando probes TCP no alvo em segundo plano...</p>
        </div>
      )}

      {result && (
        <div className="scanner-results fade-in">
          <div className="target-info-cards">
            <div className="info-card">
              <Server size={24} className="icon-blue" />
              <div className="info">
                <span className="label">Alvo Resolvido</span>
                <span className="value">{result.target_ip}</span>
              </div>
            </div>
            <div className="info-card">
              <Activity size={24} className="icon-green" />
              <div className="info">
                <span className="label">Portas Abertas</span>
                <span className="value">{result.open_count} de {result.total_scanned}</span>
              </div>
            </div>
            <div className="info-card">
              <ShieldAlert size={24} className="icon-orange" />
              <div className="info">
                <span className="label">Exposição</span>
                <span className="value">{result.open_count > 5 ? 'Alta' : result.open_count > 0 ? 'Média' : 'Baixa'}</span>
              </div>
            </div>
          </div>

          <div className="ports-grid">
            {result.open_ports.length === 0 ? (
              <div className="no-ports">
                <ShieldAlert size={48} className="icon-success" />
                <h3>Alvo Seguro</h3>
                <p>Nenhuma das portas testadas retornou conexão aperta (filtradas ou fechadas).</p>
              </div>
            ) : (
              result.open_ports.map((portInfo, idx) => (
                <div key={idx} className={`port-card severity-${getSeverity(portInfo.port)}`}>
                  <div className="port-header">
                    <span className="port-number">{portInfo.port}/TCP</span>
                    <span className="port-service">{portInfo.service}</span>
                  </div>
                  <div className="port-banner">
                    <h4><Terminal size={14}/> Banner Detectado:</h4>
                    {portInfo.banner ? (
                      <code>{portInfo.banner}</code>
                    ) : (
                      <span className="no-banner">Sem banner</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PortScanner;
