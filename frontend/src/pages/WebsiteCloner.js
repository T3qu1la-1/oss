import React, { useState } from 'react';
import { Globe, Download, Copy, Zap } from 'lucide-react';
import './ToolPages.css';

const WebsiteCloner = () => {
  const [targetUrl, setTargetUrl] = useState('');
  const [cloning, setCloning] = useState(false);
  const [result, setResult] = useState(null);

  const handleClone = async () => {
    if (!targetUrl) return;
    setCloning(true);
    
    try {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
      const data = await response.json();
      
      setResult({
        html: data.contents || 'Error fetching HTML',
        assets: [
          { type: 'HTML', count: 1, size: `${(data.contents?.length / 1024).toFixed(2)} KB` }
        ],
        success: true
      });
    } catch (error) {
      setResult({
        html: `Error: ${error.message}`,
        assets: [],
        success: false
      });
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
            <p>&gt; Clone websites for analysis</p>
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

        {result && (
          <>
            {result.success && result.assets.length > 0 && (
              <div className='stats-row'>
                {result.assets.map((asset, index) => (
                  <div key={index} className='stat-box'>
                    <div className='stat-value'>{asset.count}</div>
                    <div className='stat-label'>{asset.type} ({asset.size})</div>
                  </div>
                ))}
              </div>
            )}

            <div className='input-group-tool'>
              <label>CLONED HTML</label>
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
            WARNING: Only clone websites you own or have permission. May not work on sites with CORS.
          </span>
        </div>
      </div>
    </div>
  );
};

export default WebsiteCloner;
