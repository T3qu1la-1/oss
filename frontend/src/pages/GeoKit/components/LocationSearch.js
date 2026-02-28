import React, { useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Loader2, MapPin, Download } from 'lucide-react';
import axios from 'axios';

const INITIAL_CENTER = [-14.235, -51.9253];
const INITIAL_ZOOM = 4;

const resultIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCAzMCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNSIgY3k9IjE1IiByPSIxMCIgZmlsbD0iIzAwZmYwMCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

const FlyToLocation = ({ position, zoom }) => {
  const map = useMap();
  React.useEffect(() => {
    if (position) {
      map.flyTo(position, zoom || 14, { duration: 2 });
    }
  }, [position, zoom, map]);
  return null;
};

const LocationSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [flyToPos, setFlyToPos] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  const searchLocation = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: query, format: 'json', limit: 20, addressdetails: 1 },
        headers: { 'User-Agent': 'OlhosDeDeusGeoKit/1.0' }
      });
      const data = response.data.map((item, index) => ({
        ...item,
        id: `${item.place_id}-${index}`,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon)
      }));
      setResults(data);
      setSearchHistory(prev => [
        { query, timestamp: new Date().toISOString(), count: data.length },
        ...prev.slice(0, 9)
      ]);
      if (data.length > 0) {
        setFlyToPos([data[0].lat, data[0].lon]);
        setSelectedResult(data[0]);
      }
    } catch (error) {
      alert('Erro ao buscar');
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  const flyToResult = useCallback((result) => {
    setSelectedResult(result);
    setFlyToPos([result.lat, result.lon]);
  }, []);

  const exportResults = useCallback(() => {
    const blob = new Blob([JSON.stringify({
      query,
      results: results.map(r => ({ name: r.display_name, lat: r.lat, lon: r.lon }))
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'results.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [query, results]);

  return (
    <div className="location-search-tool">
      <div className="search-layout">
        <div className="search-panel">
          <div className="search-header">
            <h2><Search size={24} /> Busca Global</h2>
            <p>Pesquise endereços e locais</p>
          </div>
          <div className="search-input-group">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input 
                type="text"
                className="search-input"
                placeholder="Ex: Cristo Redentor, Rio..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
              />
            </div>
            <button className="search-button" onClick={searchLocation} disabled={isSearching || !query.trim()}>
              {isSearching ? <><Loader2 className="spin" size={20} /> Buscando...</> : <><Search size={20} /> Buscar</>}
            </button>
          </div>
          <div className="quick-searches">
            <h4>Buscas Rápidas:</h4>
            <div className="quick-btns">
              {['Torre Eiffel, Paris', 'Times Square, NY', 'Cristo Redentor'].map(place => (
                <button key={place} className="quick-btn" onClick={() => { setQuery(place); setTimeout(searchLocation, 100); }}>
                  {place.split(',')[0]}
                </button>
              ))}
            </div>
          </div>
          {results.length > 0 && (
            <div className="results-section">
              <div className="results-header">
                <h3>📍 {results.length} Resultados</h3>
                <button className="export-btn-small" onClick={exportResults}>
                  <Download size={16} /> Exportar
                </button>
              </div>
              <div className="results-list-scroll">
                {results.map((result, index) => (
                  <div key={result.id} className={`result-card ${selectedResult?.id === result.id ? 'selected' : ''}`} onClick={() => flyToResult(result)}>
                    <div className="result-rank">#{index + 1}</div>
                    <div className="result-content">
                      <h4>{result.display_name}</h4>
                      <div className="result-meta">
                        <span className="result-type">{result.type}</span>
                        <span className="result-coords">{result.lat.toFixed(4)}, {result.lon.toFixed(4)}</span>
                      </div>
                    </div>
                    <MapPin className="result-icon" size={20} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="search-map-container">
          <MapContainer center={INITIAL_CENTER} zoom={INITIAL_ZOOM} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <FlyToLocation position={flyToPos} />
            {results.map(result => (
              <Marker key={result.id} position={[result.lat, result.lon]} icon={resultIcon} eventHandlers={{ click: () => flyToResult(result) }}>
                <Popup><div style={{ color: '#000' }}><strong>{result.display_name}</strong></div></Popup>
              </Marker>
            ))}
          </MapContainer>
          {results.length === 0 && (
            <div className="map-placeholder">
              <Search size={64} />
              <h3>Nenhuma busca</h3>
              <p>Digite um local</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationSearch;
