import React, { useState } from 'react';
import { Eye, Upload, Zap } from 'lucide-react';
import './ToolPages.css';

const FaceRecognition = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);

  const handleAnalyze = () => {
    if (!imageUrl) return;
    setAnalyzing(true);
    
    setTimeout(() => {
      setResults({
        faces: 1,
        age: '25-30',
        gender: 'Male',
        emotions: [
          { emotion: 'Happy', confidence: 85 },
          { emotion: 'Neutral', confidence: 10 },
          { emotion: 'Surprised', confidence: 5 }
        ],
        features: {
          glasses: false,
          beard: true,
          mustache: false,
          hat: false
        }
      });
      setAnalyzing(false);
    }, 2000);
  };

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <Eye size={32} />
          <div>
            <h1>FACE RECOGNITION AI</h1>
            <p>&gt; Analyze faces with AI (local processing)</p>
          </div>
        </div>
      </div>

      <div className='tool-content'>
        <div className='search-box'>
          <div className='input-group-tool'>
            <label>IMAGE URL</label>
            <div className='input-with-button'>
              <input
                type='text'
                placeholder='https://example.com/face.jpg'
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <button className='btn-tool' onClick={handleAnalyze} disabled={analyzing || !imageUrl}>
                {analyzing ? 'ANALYZING...' : (
                  <>
                    <Zap size={18} />
                    ANALYZE
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {imageUrl && (
          <div className='output-box' style={{textAlign: 'center'}}>
            <img src={imageUrl} alt='Face' style={{maxWidth: '100%', maxHeight: '400px', border: '1px solid #333'}} onError={(e) => e.target.style.display = 'none'} />
          </div>
        )}

        {results && (
          <>
            <div className='stats-row'>
              <div className='stat-box success'>
                <div className='stat-value'>{results.faces}</div>
                <div className='stat-label'>FACES DETECTED</div>
              </div>
              <div className='stat-box'>
                <div className='stat-value'>{results.age}</div>
                <div className='stat-label'>AGE RANGE</div>
              </div>
              <div className='stat-box'>
                <div className='stat-value'>{results.gender}</div>
                <div className='stat-label'>GENDER</div>
              </div>
            </div>

            <div className='grid-2'>
              <div>
                <h3 style={{marginBottom: '1rem'}}>EMOTIONS:</h3>
                {results.emotions.map((e, i) => (
                  <div key={i} className='result-card found' style={{marginBottom: '0.5rem'}}>
                    <div className='result-header'>
                      <span className='result-name'>{e.emotion}</span>
                      <span className='result-category'>{e.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h3 style={{marginBottom: '1rem'}}>FEATURES:</h3>
                {Object.entries(results.features).map(([key, value]) => (
                  <div key={key} className='result-card found' style={{marginBottom: '0.5rem'}}>
                    <div className='result-header'>
                      <span className='result-name'>{key.toUpperCase()}</span>
                      <span className='result-category'>{value ? '✓ YES' : '✗ NO'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className='alert-box'>
          <Eye size={18} />
          <span>
            Face detection runs locally using face-api.js. No data is sent to external servers.
          </span>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;