import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Target, Globe, Search, Code, Image as ImageIcon, Link as LinkIcon, Database, Video, Shield, Server, FileText } from 'lucide-react';
import './WebScraper.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const WebScraper = () => {
  const { token } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('html');

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Acesso negado.');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/tools/web-scraper`, { url }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(response.data);
      setActiveTab('html');
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao realizar o scraping do site.');
    } finally {
      setLoading(false);
    }
  };

  const calculateSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="web-scraper-page page-container">
      <header className="page-header">
        <h1>
          <Database size={32} />
          ADVANCED WEB SCRAPER
        </h1>
        <p>Extrator universal de código-fonte, mídias, URLs, scripts e cookies de alvos remotos.</p>
      </header>

      <div className="tool-card">
        <form onSubmit={handleScrape}>
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
              {loading ? 'ANALISANDO...' : <><Search size={18} /> INICIAR SCRAPING</>}
            </button>
          </div>
        </form>
        {error && <div className="error-message">{error}</div>}
      </div>

      {result && (
        <div className="scraper-results fade-in">
          
          <div className="summary-cards">
            <div className="summary-card">
               <Server size={24} className="icon-blue" />
               <div className="info">
                 <span className="label">Status & Servidor</span>
                 <span className="value">HTTP {result.status_code} | {result.server}</span>
               </div>
            </div>
            <div className="summary-card">
               <FileText size={24} className="icon-green" />
               <div className="info">
                 <span className="label">Tamanho do HTML</span>
                 <span className="value">{calculateSize(result.html.length)}</span>
               </div>
            </div>
            <div className="summary-card">
               <LinkIcon size={24} className="icon-orange" />
               <div className="info">
                 <span className="label">Links Encontrados</span>
                 <span className="value">{result.links.length}</span>
               </div>
            </div>
            <div className="summary-card">
               <ImageIcon size={24} className="icon-purple" />
               <div className="info">
                 <span className="label">Mídias (IMG/VID)</span>
                 <span className="value">{result.assets.images.length + result.assets.videos.length}</span>
               </div>
            </div>
          </div>

          <div className="scraper-tabs">
            <button className={`tab-btn ${activeTab === 'html' ? 'active' : ''}`} onClick={() => setActiveTab('html')}>
               <Code size={16}/> RAW HTML
            </button>
            <button className={`tab-btn ${activeTab === 'assets' ? 'active' : ''}`} onClick={() => setActiveTab('assets')}>
               <FileText size={16}/> CSS & JS
            </button>
            <button className={`tab-btn ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')}>
               <ImageIcon size={16}/> MÍDIA
            </button>
            <button className={`tab-btn ${activeTab === 'links' ? 'active' : ''}`} onClick={() => setActiveTab('links')}>
               <LinkIcon size={16}/> URLs EXTRAÍDAS
            </button>
            <button className={`tab-btn ${activeTab === 'cookies' ? 'active' : ''}`} onClick={() => setActiveTab('cookies')}>
               <Shield size={16}/> COOKIES
            </button>
          </div>

          <div className="tab-content">
            
            {activeTab === 'html' && (
              <div className="content-panel code-panel">
                <div className="panel-header">
                  <h3>Código-Fonte HTML</h3>
                </div>
                <textarea readOnly value={result.html.content} className="html-display" />
              </div>
            )}

            {activeTab === 'assets' && (
              <div className="content-panel split-panel">
                <div className="split-half">
                  <h3><FileText size={18}/> Arquivos CSS ({result.assets.css_files.length})</h3>
                  <ul className="asset-list">
                    {result.assets.css_files.map((css, i) => (
                      <li key={i}><a href={css} target="_blank" rel="noopener noreferrer">{css}</a></li>
                    ))}
                  </ul>
                  {result.assets.css_files.length === 0 && <p className="no-data">Nenhum CSS externo.</p>}
                </div>
                <div className="split-half">
                  <h3><Code size={18}/> Arquivos JS ({result.assets.js_files.length})</h3>
                  <ul className="asset-list">
                    {result.assets.js_files.map((js, i) => (
                      <li key={i}><a href={js} target="_blank" rel="noopener noreferrer">{js}</a></li>
                    ))}
                  </ul>
                  {result.assets.js_files.length === 0 && <p className="no-data">Nenhum JS externo.</p>}
                </div>
              </div>
            )}

            {activeTab === 'media' && (
              <div className="content-panel media-panel">
                 <div className="media-section">
                    <h3><ImageIcon size={18}/> Imagens Encontradas ({result.assets.images.length})</h3>
                    <div className="media-grid">
                      {result.assets.images.slice(0, 50).map((img, i) => (
                         <div key={i} className="media-card">
                            <img src={img} alt={`Asset ${i}`} loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                            <a href={img} target="_blank" rel="noopener noreferrer" className="media-link">{img.split('/').pop() || 'Ver Imagem'}</a>
                         </div>
                      ))}
                    </div>
                    {result.assets.images.length > 50 && <p className="warning-text">Mostrando as primeiras 50 de {result.assets.images.length} imagens.</p>}
                    {result.assets.images.length === 0 && <p className="no-data">Nenhuma imagem encontrada.</p>}
                 </div>

                 <div className="media-section" style={{marginTop:'2rem'}}>
                    <h3><Video size={18}/> Vídeos Encontrados ({result.assets.videos.length})</h3>
                    <ul className="asset-list">
                      {result.assets.videos.map((vid, i) => (
                        <li key={i}><a href={vid} target="_blank" rel="noopener noreferrer">{vid}</a></li>
                      ))}
                    </ul>
                    {result.assets.videos.length === 0 && <p className="no-data">Nenhum vídeo encontrado.</p>}
                 </div>
              </div>
            )}

            {activeTab === 'links' && (
              <div className="content-panel links-panel">
                 <h3><LinkIcon size={18}/> URLs & Links Encontrados ({result.links.length})</h3>
                 {result.links.length === 0 ? <p className="no-data">Nenhum link detectado.</p> : (
                   <div className="table-responsive">
                     <table className="data-table">
                       <thead>
                         <tr>
                           <th>Texto da Âncora</th>
                           <th>URL de Destino</th>
                         </tr>
                       </thead>
                       <tbody>
                         {result.links.map((link, i) => (
                           <tr key={i}>
                             <td>{link.text || 'N/A'}</td>
                             <td><a href={link.href} target="_blank" rel="noopener noreferrer">{link.href}</a></td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
              </div>
            )}

            {activeTab === 'cookies' && (
              <div className="content-panel cookies-panel">
                 <h3><Shield size={18}/> Cookies Identificados ({result.cookies.length})</h3>
                 {result.cookies.length === 0 ? <p className="no-data">O servidor não definiu cookies no HTML primário.</p> : (
                   <div className="cookie-cards">
                      {result.cookies.map((c, i) => (
                          <div key={i} className="cookie-card">
                            <div className="cookie-header">
                              <strong>{c.name}</strong>
                              <div className="badges">
                                {c.secure && <span className="badge true">Secure</span>}
                                {c.httponly && <span className="badge true">HttpOnly</span>}
                              </div>
                            </div>
                            <div className="cookie-val"><code>{c.value.length > 60 ? c.value.substring(0,60)+'...' : c.value}</code></div>
                            <div className="cookie-meta">
                               <span>Domínio: {c.domain || 'N/A'}</span>
                               <span>Path: {c.path}</span>
                            </div>
                          </div>
                      ))}
                   </div>
                 )}
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
};

export default WebScraper;
