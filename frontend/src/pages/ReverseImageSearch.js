import React, { useState } from 'react';
import { Target, Upload, Search, ExternalLink, Check, X, Clock, Loader } from 'lucide-react';
import axios from 'axios';
import './ToolPages.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ReverseImageSearch = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setImageUrl(url);
    }
  };

  const handleSearch = async () => {
    if (!imageUrl) return;
    
    setLoading(true);
    setError('');
    setResults(null);
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/tools/reverse-image-search`, {
        imageUrl: imageUrl
      });
      
      setResults(response.data);
    } catch (err) {
      setError('Erro ao buscar imagem: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (engineResult) => {
    if (engineResult.available) {
      return <Check size={20} color="#00ff41" />;
    } else if (engineResult.status === 'timeout') {
      return <Clock size={20} color="#ffcc00" />;
    } else {
      return <X size={20} color="#ff6b35" />;
    }
  };

  const getStatusText = (engineResult) => {
    if (engineResult.available) {
      return typeof engineResult.results_found === 'number' 
        ? `${engineResult.results_found} resultados encontrados`
        : 'Resultados disponíveis';
    } else if (engineResult.status === 'timeout') {
      return 'Timeout';
    } else {
      return 'Sem resultados';
    }
  };

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <Target size={32} />
          <div>
            <h1>REVERSE IMAGE SEARCH PRO</h1>
            <p>&gt; Busca automática em múltiplos motores de pesquisa</p>
          </div>
        </div>
      </div>

      <div className='tool-content'>
        <div className='grid-2'>
          <div className='input-group-tool'>
            <label>IMAGE URL</label>
            <input
              type='text'
              placeholder='https://example.com/image.jpg'
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          <div className='input-group-tool'>
            <label>OR UPLOAD FILE</label>
            <input
              type='file'
              accept='image/*'
              onChange={handleFileChange}
              style={{padding: '0.5rem'}}
            />
          </div>
        </div>

        <button 
          className='btn-tool' 
          onClick={handleSearch} 
          disabled={!imageUrl || loading}
        >
          {loading ? (
            <>
              <Loader size={18} className="spinning" />
              BUSCANDO...
            </>
          ) : (
            <>
              <Search size={18} />
              BUSCAR EM TODOS OS MOTORES
            </>
          )}
        </button>

        {error && (
          <div className='output-box' style={{background: '#2a0000', borderColor: '#ff6b35', marginTop: '1rem'}}>
            <p style={{color: '#ff6b35', margin: 0}}>{error}</p>
          </div>
        )}

        {imageUrl && !loading && !results && (
          <div className='output-box' style={{textAlign: 'center', marginTop: '1rem'}}>
            <img 
              src={imageUrl} 
              alt='Target' 
              style={{maxWidth: '100%', maxHeight: '300px', border: '1px solid #333'}} 
              onError={(e) => e.target.style.display = 'none'} 
            />
          </div>
        )}

        {results && (
          <div style={{marginTop: '2rem'}}>
            <div className='output-box' style={{marginBottom: '1rem', textAlign: 'center'}}>
              <h3 style={{color: '#00ff41', marginBottom: '0.5rem'}}>
                {results.successfulSearches} de {results.totalEngines} motores encontraram resultados
              </h3>
              <img 
                src={results.imageUrl} 
                alt='Searched' 
                style={{maxWidth: '300px', maxHeight: '200px', border: '1px solid #333', marginTop: '1rem'}} 
                onError={(e) => e.target.style.display = 'none'} 
              />
            </div>

            <div className='results-grid'>
              {results.engines.map((engineResult, index) => (
                <div 
                  key={index} 
                  className={`result-card ${engineResult.available ? 'found' : 'not-found'}`}
                  style={{
                    borderColor: engineResult.available ? '#00ff41' : '#333',
                    background: engineResult.available ? 'rgba(0, 255, 65, 0.05)' : 'rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div className='result-header' style={{marginBottom: '1rem'}}>
                    {getStatusIcon(engineResult)}
                    <span className='result-name' style={{marginLeft: '0.5rem'}}>
                      {engineResult.engine}
                    </span>
                  </div>
                  
                  <div style={{marginBottom: '0.75rem', fontSize: '0.9rem', color: '#ccc'}}>
                    {getStatusText(engineResult)}
                  </div>

                  {engineResult.snippet && (
                    <div style={{
                      fontSize: '0.85rem', 
                      color: '#888', 
                      marginBottom: '1rem',
                      fontStyle: 'italic'
                    }}>
                      {engineResult.snippet}
                    </div>
                  )}
                  
                  <a 
                    href={engineResult.url} 
                    target='_blank' 
                    rel='noopener noreferrer' 
                    className='result-link'
                  >
                    <span>Ver resultados completos</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .result-card.not-found {
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};

export default ReverseImageSearch;
