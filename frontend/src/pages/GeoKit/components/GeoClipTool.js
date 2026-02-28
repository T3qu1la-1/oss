import React, { useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { Upload, Loader2, X, Download, Zap } from 'lucide-react';

const INITIAL_CENTER = [0, 20];
const INITIAL_ZOOM = 2;

// Heatmap component
const GeoClipHeatmap = ({ predictions }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!predictions || predictions.length === 0) return;

    const heatData = predictions.map(p => [p.lat, p.lon, p.confidence]);
    const heat = L.heatLayer(heatData, {
      radius: 30,
      blur: 20,
      maxZoom: 10,
      gradient: {
        0.0: '#00ff00',
        0.3: '#00ffff',
        0.6: '#ffff00',
        1.0: '#ff0000'
      }
    }).addTo(map);

    // Fit bounds to predictions
    const bounds = L.latLngBounds(predictions.map(p => [p.lat, p.lon]));
    map.fitBounds(bounds, { padding: [50, 50], duration: 2 });

    return () => {
      map.removeLayer(heat);
    };
  }, [predictions, map]);

  return null;
};

const GeoClipTool = () => {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const mapRef = useRef();

  // Handle image upload
  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setPredictions(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Remove image
  const removeImage = useCallback(() => {
    setImage(null);
    setImageFile(null);
    setPredictions(null);
  }, []);

  // Simulate GeoClip analysis
  const analyzeImage = useCallback(async () => {
    if (!image) return;
    
    setIsAnalyzing(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock predictions
    const baseLat = (Math.random() - 0.5) * 150;
    const baseLon = (Math.random() - 0.5) * 300;
    
    const mockPredictions = [];
    for (let i = 0; i < 100; i++) {
      const distance = Math.random() * 5;
      const angle = Math.random() * Math.PI * 2;
      
      mockPredictions.push({
        lat: baseLat + Math.cos(angle) * distance,
        lon: baseLon + Math.sin(angle) * distance,
        confidence: Math.random(),
        rank: i + 1
      });
    }
    
    mockPredictions.sort((a, b) => b.confidence - a.confidence);
    setPredictions(mockPredictions);
    setIsAnalyzing(false);
  }, [image]);

  // Export results
  const exportResults = useCallback(() => {
    if (!predictions) return;
    
    const data = {
      image: imageFile?.name || 'unknown',
      timestamp: new Date().toISOString(),
      predictions: predictions.slice(0, 10).map(p => ({
        rank: p.rank,
        latitude: p.lat,
        longitude: p.lon,
        confidence: p.confidence
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'geoclip-results.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [predictions, imageFile]);

  // Fly to prediction
  const flyToPrediction = useCallback((pred) => {
    setSelectedPrediction(pred);
    if (mapRef.current) {
      mapRef.current.flyTo([pred.lat, pred.lon], 8, { duration: 1 });
    }
  }, []);

  return (
    <div className="geoclip-tool">
      <div className="tool-header-section">
        <h2><Zap size={24} /> GeoClip AI - Geolocalização por Imagem</h2>
        <p>Upload de imagem para predição de localização usando deep learning</p>
      </div>

      <div className="geoclip-layout">
        {/* Sidebar */}
        <div className="geoclip-sidebar">
          {!image ? (
            <div className="upload-zone">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                id="geoclip-upload"
                style={{display: 'none'}}
              />
              <label htmlFor="geoclip-upload" className="upload-label">
                <div className="upload-icon">
                  <Upload size={48} />
                </div>
                <h3>Upload de Imagem</h3>
                <p>Arraste ou clique para selecionar</p>
                <small>JPG, PNG, WebP (max 10MB)</small>
              </label>
            </div>
          ) : (
            <div className="image-preview-section">
              <div className="image-preview-header">
                <h3>Imagem Carregada</h3>
                <button className="remove-btn" onClick={removeImage}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="image-preview">
                <img src={image} alt="Uploaded" />
              </div>

              <button 
                className={`analyze-button ${isAnalyzing ? 'analyzing' : ''}`}
                onClick={analyzeImage}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="spin" size={20} />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Zap size={20} />
                    Analisar Localização
                  </>
                )}
              </button>
            </div>
          )}

          {predictions && (
            <div className="predictions-results">
              <div className="results-header">
                <h3>Top 10 Predições</h3>
                <button className="export-btn" onClick={exportResults}>
                  <Download size={16} /> Exportar
                </button>
              </div>
              
              <div className="predictions-list">
                {predictions.slice(0, 10).map(pred => (
                  <div 
                    key={pred.rank}
                    className={`prediction-item ${selectedPrediction?.rank === pred.rank ? 'selected' : ''}`}
                    onClick={() => flyToPrediction(pred)}
                  >
                    <div className="pred-rank">#{pred.rank}</div>
                    <div className="pred-info">
                      <div className="pred-coords">
                        {pred.lat.toFixed(4)}, {pred.lon.toFixed(4)}
                      </div>
                      <div className="pred-confidence">
                        Confiança: {(pred.confidence * 100).toFixed(1)}%
                      </div>
                      <div className="confidence-bar">
                        <div 
                          className="confidence-fill" 
                          style={{width: `${pred.confidence * 100}%`}}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="geoclip-map-container">
          <MapContainer
            center={INITIAL_CENTER}
            zoom={INITIAL_ZOOM}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap'
            />
            
            {predictions && <GeoClipHeatmap predictions={predictions} />}
          </MapContainer>

          {!predictions && (
            <div className="map-placeholder">
              <Zap size={64} />
              <h3>Aguardando Análise</h3>
              <p>Upload uma imagem e clique em "Analisar Localização"</p>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="geoclip-info">
        <h3>🤖 Como Funciona o GeoClip:</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>1. Upload da Imagem</h4>
            <p>Envie uma foto de qualquer lugar do mundo</p>
          </div>
          <div className="info-card">
            <h4>2. Análise com IA</h4>
            <p>GeoClip analisa características visuais</p>
          </div>
          <div className="info-card">
            <h4>3. Predições</h4>
            <p>Top-K localizações mais prováveis</p>
          </div>
          <div className="info-card">
            <h4>4. Visualização</h4>
            <p>Heatmap interativo mostrando probabilidades</p>
          </div>
        </div>
        
        <div className="warning-box">
          ⚠️ <strong>Demo Mode:</strong> Esta é uma simulação. Para análise real, é necessário backend com modelo GeoClip.
        </div>
      </div>
    </div>
  );
};

export default GeoClipTool;