import React, { useState } from 'react';
import { Globe, Download, Copy, Zap, Info, FolderArchive, Map } from 'lucide-react';
import './ToolPages.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const WebsiteCloner = () => {
  const [targetUrl, setTargetUrl] = useState('');
  const [cloneSubpages, setCloneSubpages] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleClone = async () => {
    if (!targetUrl) return;
    
    // Frontend Target Validation
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      setError('A URL deve começar com http:// ou https://');
      return;
    }

    setCloning(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/api/tools/clone-website`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, clone_subpages: cloneSubpages })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Falha ao clonar o site');
      }
      
      const data = await response.json();
      setResult({
        html: data.html,
        size: `${(data.size / 1024).toFixed(2)} KB`,
        status: data.status,
        zip_base64: data.zip_base64,
        pages_cloned: data.pages_cloned,
        assets_cloned: data.assets_cloned,
        success: true
      });
    } catch (err) {
      setError(err.message);
      setResult(null);
    }
    
    setCloning(false);
  };

  const downloadHTML = () => {
    const blob = new Blob([result.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloned_index_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadZIP = () => {
    if (!result.zip_base64) return;
    
    // Converter Base64 para Blob diretamente
    const byteCharacters = atob(result.zip_base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    // Extrai o nome do domínio ou cria um genérico
    const filename = targetUrl.replace(/^https?:\/\//, '').split('/')[0] || 'site';
    a.download = `${filename}_clonado.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <Globe size={32} />
          <div>
            <h1>WEBSITE CLONER AVANÇADO</h1>
            <p>&gt; Clone sites inteiros, incluindo CSS, JS e sub-páginas off-line</p>
          </div>
        </div>
      </div>

      <div className='tool-content'>
        <div className='search-box'>
          <div className='input-group-tool'>
            <label>TARGET URL</label>
            <div className='input-with-button'>
              <input
                type='text'
                placeholder='https://site-alvo.com'
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
              <button className='btn-tool' onClick={handleClone} disabled={cloning || !targetUrl}>
                {cloning ? 'CLONANDO...' : (
                  <>
                    <Zap size={18} />
                    CLONAR
                  </>
                )}
              </button>
            </div>
            
            <div className='options-row' style={{marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px'}}>
               <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px', color: '#a0aec0'}}>
                 <input 
                   type="checkbox" 
                   checked={cloneSubpages} 
                   onChange={(e) => setCloneSubpages(e.target.checked)}
                   style={{accentColor: '#10b981', width: '16px', height: '16px'}}
                 />
                 <Map size={16}/> Clonar Sub-páginas Recursivamente (Máx 15)
               </label>
            </div>
          </div>
        </div>

        {error && (
          <div className='alert-box' style={{borderLeftColor: '#f00', color: '#f00'}}>
            <span>ERRO: {error}</span>
          </div>
        )}

        {result && result.success && (
          <>
            <div className='stats-row'>
              <div className='stat-box success'>
                <div className='stat-value'>HTTP {result.status}</div>
                <div className='stat-label'>STATUS</div>
              </div>
              <div className='stat-box'>
                <div className='stat-value'>{result.size}</div>
                <div className='stat-label'>HTML SIZE</div>
              </div>
              <div className='stat-box'>
                <div className='stat-value'>{result.assets_cloned || 0}</div>
                <div className='stat-label'>ASSETS (CSS/JS/IMG)</div>
              </div>
              {result.pages_cloned > 1 && (
                <div className='stat-box success'>
                  <div className='stat-value'>{result.pages_cloned}</div>
                  <div className='stat-label'>PÁGINAS FIXADAS</div>
                </div>
              )}
            </div>

            <div className='input-group-tool'>
              <label>INDEX HTML PREVIEW</label>
              <textarea value={result.html} readOnly style={{minHeight: '200px', fontSize: '12px'}} />
            </div>

            <div className='stats-row' style={{marginTop: '20px'}}>
              <button className='btn-tool btn-primary' onClick={downloadZIP} style={{background: '#10b981', color: '#000', fontWeight: 'bold'}} disabled={!result.zip_base64}>
                <FolderArchive size={18} />
                BAIXAR ZIP COMPLETO (RECOMENDADO)
              </button>
              <button className='btn-tool btn-secondary' onClick={downloadHTML}>
                <Download size={18} />
                APENAS HTML
              </button>
              <button className='btn-tool btn-secondary' onClick={() => navigator.clipboard.writeText(result.html)}>
                <Copy size={18} />
                COPIAR HTML
              </button>
            </div>
          </>
        )}

        <div className='alert-box'>
          <Info size={18} />
          <span>
            <strong>Dica:</strong> O botão "BAIXAR ZIP COMPLETO" compacta o index.html, cria a pasta `/assets` contendo todos 
            os estilos CSS, scripts JS vitais e re-escreve os caminhos do código-fonte para que tudo funcione perfeitamente local (offline).
          </span>
        </div>
      </div>
    </div>
  );
};

export default WebsiteCloner;