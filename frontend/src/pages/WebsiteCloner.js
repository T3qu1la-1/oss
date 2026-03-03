import React, { useState } from 'react';
import { Globe, Download, Copy, Zap } from 'lucide-react';
import './ToolPages.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const WebsiteCloner = () => {
  const [targetUrl, setTargetUrl] = useState('');
  const [cloning, setCloning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleClone = async () => {
    if (!targetUrl) return;
    setCloning(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/api/tools/clone-website`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to clone');
      }
      
      const data = await response.json();
      setResult({
        html: data.html,
        size: `${(data.size / 1024).toFixed(2)} KB`,
        status: data.status,
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
    a.download = 'cloned_site.html';
    a.click();
  };

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <Globe size={32} />
          <div>
            <h1>WEBSITE CLONER</h1>
            <p>&gt; Clone websites for real</p>
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
                placeholder='https://example.com'
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
              <button className='btn-tool' onClick={handleClone} disabled={cloning || !targetUrl}>
                {cloning ? 'CLONING...' : (
                  <>
                    <Zap size={18} />
                    CLONE
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className='alert-box' style={{borderLeftColor: '#f00', color: '#f00'}}>
            <span>ERROR: {error}</span>
          </div>
        )}

        {result && result.success && (
          <>
            <div className='stats-row'>
              <div className='stat-box success'>
                <div className='stat-value'>{result.status}</div>
                <div className='stat-label'>STATUS</div>
              </div>
              <div className='stat-box'>
                <div className='stat-value'>{result.size}</div>
                <div className='stat-label'>SIZE</div>
              </div>
            </div>

            <div className='input-group-tool'>
              <label>CLONED HTML ({result.html.length.toLocaleString()} characters)</label>
              <textarea value={result.html} readOnly style={{minHeight: '300px'}} />
            </div>

            <div className='stats-row'>
              <button className='btn-tool btn-secondary' onClick={() => navigator.clipboard.writeText(result.html)}>
                <Copy size={18} />
                COPY HTML
              </button>
              <button className='btn-tool btn-secondary' onClick={downloadHTML}>
                <Download size={18} />
                DOWNLOAD
              </button>
            </div>
          </>
        )}

        <div className='alert-box'>
          <Globe size={18} />
          <span>
            Only clone websites you own. Some sites may block requests (CORS/bot detection).
          </span>
        </div>
      </div>
    </div>
  );
};

export default WebsiteCloner;