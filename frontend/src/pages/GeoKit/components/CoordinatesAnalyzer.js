import React, { useState, useCallback } from 'react';
import { Target, Copy, Download, Map, Navigation } from 'lucide-react';
import axios from 'axios';

const CoordinatesAnalyzer = () => {
  const [coords, setCoords] = useState({ lat: '', lng: '' });
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze coordinates
  const analyzeCoords = useCallback(async () => {
    if (!coords.lat || !coords.lng) {
      alert('Por favor, insira latitude e longitude');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Reverse geocoding
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat: coords.lat,
          lon: coords.lng,
          format: 'json',
          addressdetails: 1,
          extratags: 1,
          namedetails: 1
        },
        headers: {
          'User-Agent': 'OlhosDeDeusGeoKit/1.0'
        }
      });
      
      setAnalysis(response.data);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Erro ao analisar coordenadas');
    } finally {
      setIsAnalyzing(false);
    }
  }, [coords]);

  // Format conversions
  const formatDMS = useCallback((lat, lng) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    
    const latAbs = Math.abs(lat);
    const lngAbs = Math.abs(lng);
    
    const latDeg = Math.floor(latAbs);
    const latMin = Math.floor((latAbs - latDeg) * 60);
    const latSec = ((latAbs - latDeg - latMin / 60) * 3600).toFixed(2);
    
    const lngDeg = Math.floor(lngAbs);
    const lngMin = Math.floor((lngAbs - lngDeg) * 60);
    const lngSec = ((lngAbs - lngDeg - lngMin / 60) * 3600).toFixed(2);
    
    return {
      lat: `${latDeg}°${latMin}'${latSec}"${latDir}`,
      lng: `${lngDeg}°${lngMin}'${lngSec}"${lngDir}`,
      full: `${latDeg}°${latMin}'${latSec}"${latDir} ${lngDeg}°${lngMin}'${lngSec}"${lngDir}`
    };
  }, []);

  const toUTM = useCallback((lat, lng) => {
    // Simplified UTM conversion
    const zone = Math.floor((lng + 180) / 6) + 1;
    const hemisphere = lat >= 0 ? 'N' : 'S';
    return `Zone ${zone}${hemisphere}`;
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text);
    alert('Copiado!');
  }, []);

  // Export analysis
  const exportAnalysis = useCallback(() => {
    const data = {
      coordinates: {
        decimal: { lat: coords.lat, lng: coords.lng },
        dms: formatDMS(parseFloat(coords.lat), parseFloat(coords.lng))
      },
      analysis,
      timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'coords-analysis.json';
    link.click();
  }, [coords, analysis, formatDMS]);

  return (
    <div className="coords-analyzer-tool">
      <div className="tool-header-section">
        <h2><Target size={24} /> Analisador de Coordenadas</h2>
        <p>Converta formatos e obtenha informações detalhadas sobre qualquer localização</p>
      </div>

      {/* Input Section */}
      <div className="coords-input-section">
        <div className="input-row">
          <div className="input-field">
            <label>Latitude (decimal):</label>
            <input 
              type="number" 
              placeholder="-14.235004"
              value={coords.lat}
              onChange={(e) => setCoords({...coords, lat: e.target.value})}
              step="0.000001"
            />
          </div>
          <div className="input-field">
            <label>Longitude (decimal):</label>
            <input 
              type="number" 
              placeholder="-51.925280"
              value={coords.lng}
              onChange={(e) => setCoords({...coords, lng: e.target.value})}
              step="0.000001"
            />
          </div>
          <button 
            className="analyze-button"
            onClick={analyzeCoords}
            disabled={isAnalyzing || !coords.lat || !coords.lng}
          >
            {isAnalyzing ? 'Analisando...' : 'Analisar'}
          </button>
        </div>

        {/* Quick Examples */}
        <div className="quick-coords">
          <h4>Exemplos rápidos:</h4>
          <div className="coord-examples">
            {[
              { name: 'Cristo Redentor', lat: -22.9519, lng: -43.2105 },
              { name: 'Torre Eiffel', lat: 48.8584, lng: 2.2945 },
              { name: 'Estátua da Liberdade', lat: 40.6892, lng: -74.0445 },
              { name: 'Grande Muralha', lat: 40.4319, lng: 116.5704 }
            ].map(place => (
              <button 
                key={place.name}
                className="coord-example"
                onClick={() => setCoords({ lat: place.lat, lng: place.lng })}
              >
                {place.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {coords.lat && coords.lng && (
        <div className="analysis-results">
          {/* Format Conversions */}
          <div className="result-card">
            <h3>🎯 Formatos de Coordenadas</h3>
            <div className="format-list">
              <div className="format-item">
                <strong>Decimal (DD):</strong>
                <div className="format-value">
                  {coords.lat}, {coords.lng}
                  <button onClick={() => copyToClipboard(`${coords.lat}, ${coords.lng}`)}>
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <div className="format-item">
                <strong>DMS (Graus, Minutos, Segundos):</strong>
                <div className="format-value">
                  {formatDMS(parseFloat(coords.lat), parseFloat(coords.lng)).full}
                  <button onClick={() => copyToClipboard(formatDMS(parseFloat(coords.lat), parseFloat(coords.lng)).full)}>
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <div className="format-item">
                <strong>UTM:</strong>
                <div className="format-value">
                  {toUTM(parseFloat(coords.lat), parseFloat(coords.lng))}
                  <button onClick={() => copyToClipboard(toUTM(parseFloat(coords.lat), parseFloat(coords.lng)))}>
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <div className="format-item">
                <strong>Google Maps:</strong>
                <div className="format-value">
                  <a 
                    href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir no Google Maps <Map size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Location Info */}
          {analysis && (
            <>
              <div className="result-card">
                <h3>🗺️ Informações da Localização</h3>
                <div className="location-info">
                  <div className="info-item">
                    <strong>Endereço Completo:</strong>
                    <p>{analysis.display_name}</p>
                  </div>
                  
                  {analysis.address && (
                    <div className="address-grid">
                      {analysis.address.country && (
                        <div className="info-item">
                          <strong>País:</strong>
                          <p>🏳️ {analysis.address.country}</p>
                        </div>
                      )}
                      {analysis.address.state && (
                        <div className="info-item">
                          <strong>Estado/Região:</strong>
                          <p>{analysis.address.state}</p>
                        </div>
                      )}
                      {analysis.address.city && (
                        <div className="info-item">
                          <strong>Cidade:</strong>
                          <p>{analysis.address.city}</p>
                        </div>
                      )}
                      {analysis.address.postcode && (
                        <div className="info-item">
                          <strong>CEP/Postal:</strong>
                          <p>{analysis.address.postcode}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="info-item">
                    <strong>Tipo:</strong>
                    <p>{analysis.type} - {analysis.class}</p>
                  </div>
                </div>
              </div>

              <button className="export-button" onClick={exportAnalysis}>
                <Download size={20} /> Exportar Análise Completa
              </button>
            </>
          )}
        </div>
      )}

      {/* Info Panel */}
      <div className="coords-info">
        <h3>🎯 Funcionalidades:</h3>
        <div className="info-grid">
          <div className="info-card-small">
            <h4>Conversão de Formatos</h4>
            <ul>
              <li>Decimal (DD)</li>
              <li>DMS (Graus/Minutos/Segundos)</li>
              <li>UTM (Universal Transverse Mercator)</li>
            </ul>
          </div>
          <div className="info-card-small">
            <h4>Reverse Geocoding</h4>
            <ul>
              <li>Endereço completo</li>
              <li>Informações administrativas</li>
              <li>Tipo de localização</li>
            </ul>
          </div>
          <div className="info-card-small">
            <h4>Exportação</h4>
            <ul>
              <li>JSON com todos os dados</li>
              <li>Cópia rápida para clipboard</li>
              <li>Links diretos para mapas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinatesAnalyzer;