import React, { useState, useEffect, useRef } from 'react';
import { Eye, Upload, Zap, Loader } from 'lucide-react';
import './ToolPages.css';

const FaceRecognition = () => {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const loadFaceApiModels = async () => {
      try {
        // Load face-api.js from CDN
        if (!window.faceapi) {
          await loadScript('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js');
        }
        
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          window.faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        
        setModelsLoaded(true);
      } catch (error) {
        console.error('Error loading face-api models:', error);
      }
    };

    loadFaceApiModels();
  }, []);

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
      setResults(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file || !modelsLoaded) return;
    setAnalyzing(true);
    
    try {
      const img = document.createElement('img');
      img.src = imagePreview;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const detections = await window.faceapi
        .detectAllFaces(img, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender();

      if (detections.length === 0) {
        setResults({
          faces: 0,
          error: 'No faces detected'
        });
      } else {
        const detection = detections[0];
        const expressions = detection.expressions;
        const topExpression = Object.entries(expressions)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([emotion, confidence]) => ({
            emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
            confidence: Math.round(confidence * 100)
          }));

        setResults({
          faces: detections.length,
          age: Math.round(detection.age),
          gender: detection.gender.charAt(0).toUpperCase() + detection.gender.slice(1),
          genderConfidence: Math.round(detection.genderProbability * 100),
          emotions: topExpression,
          features: {
            'Face Detected': true,
            'Landmarks': detection.landmarks ? true : false,
            'Expression Analysis': true,
            'Age Detection': true
          }
        });

        // Draw detections on canvas
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          window.faceapi.draw.drawDetections(canvas, detections);
          window.faceapi.draw.drawFaceLandmarks(canvas, detections);
        }
      }
    } catch (error) {
      setResults({
        faces: 0,
        error: error.message
      });
    }
    
    setAnalyzing(false);
  };

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <Eye size={32} />
          <div>
            <h1>FACE RECOGNITION AI</h1>
            <p>&gt; Real AI-powered face analysis (local)</p>
          </div>
        </div>
      </div>

      <div className='tool-content'>
        <div className='input-group-tool'>
          <label>UPLOAD FACE IMAGE</label>
          <input
            type='file'
            accept='image/*'
            onChange={handleFileChange}
            style={{padding: '0.5rem'}}
          />
        </div>

        {!modelsLoaded && (
          <div className='alert-box'>
            <Loader className='spin' size={18} />
            <span>Loading AI models... Please wait.</span>
          </div>
        )}

        <button className='btn-tool' onClick={handleAnalyze} disabled={analyzing || !file || !modelsLoaded}>
          {analyzing ? (
            <>
              <Loader className='spin' size={18} />
              ANALYZING...
            </>
          ) : (
            <>
              <Zap size={18} />
              ANALYZE FACE
            </>
          )}
        </button>

        {imagePreview && (
          <div className='output-box' style={{textAlign: 'center', marginTop: '1rem', position: 'relative'}}>
            <img src={imagePreview} alt='Face' style={{maxWidth: '100%', maxHeight: '400px', border: '1px solid #333', display: results ? 'none' : 'block'}} />
            <canvas ref={canvasRef} style={{maxWidth: '100%', maxHeight: '400px', border: '1px solid #333', display: results ? 'block' : 'none'}} />
          </div>
        )}

        {results && (
          <>
            {results.error ? (
              <div className='alert-box' style={{borderLeftColor: '#f00', color: '#f00'}}>
                <span>{results.error}</span>
              </div>
            ) : (
              <>
                <div className='stats-row'>
                  <div className='stat-box success'>
                    <div className='stat-value'>{results.faces}</div>
                    <div className='stat-label'>FACES</div>
                  </div>
                  <div className='stat-box'>
                    <div className='stat-value'>{results.age}</div>
                    <div className='stat-label'>AGE</div>
                  </div>
                  <div className='stat-box'>
                    <div className='stat-value'>{results.gender}</div>
                    <div className='stat-label'>GENDER ({results.genderConfidence}%)</div>
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
                          <span className='result-name'>{key}</span>
                          <span className='result-category'>{value ? '✓ YES' : '✗ NO'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <div className='alert-box'>
          <Eye size={18} />
          <span>
            Powered by face-api.js. All processing is done locally in your browser. No data is sent to servers.
          </span>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;