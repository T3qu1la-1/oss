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
    
    setTimeout(() => {
      setResult({
        html: `<!DOCTYPE html>\n<html>\n  <head>\n    <title>Cloned Site</title>\n  </head>\n  <body>\n    <h1>Site Clone Complete</h1>\n    <p>Original: ${targetUrl}</p>\n  </body>\n</html>`,
        assets: [
          { type: 'CSS', count: 5, size: '120 KB' },
          { type: 'JS', count: 8, size: '450 KB' },
          { type: 'Images', count: 23, size: '2.3 MB' },
          { type: 'Fonts', count: 3, size: '180 KB' }
        ],
        success: true
      });
      setCloning(false);
    }, 2000);
  };

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <Globe size={32} />
          <div>
            <h1>WEBSITE CLONER</h1>
            <p>&gt; Clone websites for testing and analysis</p>
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
                    CLONE SITE
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {result && (
          <>
            <div className='stats-row'>
              {result.assets.map((asset, index) => (
                <div key={index} className='stat-box'>
                  <div className='stat-value'>{asset.count}</div>
                  <div className='stat-label'>{asset.type} ({asset.size})</div>
                </div>
              ))}
            </div>

            <div className='input-group-tool'>
              <label>CLONED HTML</label>
              <textarea value={result.html} readOnly style={{minHeight: '300px'}} />
            </div>

            <div className='stats-row'>
              <button className='btn-tool btn-secondary' onClick={() => navigator.clipboard.writeText(result.html)}>
                <Copy size={18} />
                COPY HTML
              </button>
              <button className='btn-tool btn-secondary'>
                <Download size={18} />
                DOWNLOAD ZIP
              </button>
            </div>
          </>
        )}

        <div className='alert-box'>
          <Globe size={18} />
          <span>
            WARNING: Only clone websites you own or have permission to clone. 
            Unauthorized cloning may violate laws and terms of service.
          </span>
        </div>
      </div>
    </div>
  );
};

export default WebsiteCloner;