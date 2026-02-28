import React, { useState, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from '@deck.gl/core';
import { Search, Loader2, MapPin, Navigation, Download } from 'lucide-react';
import axios from 'axios';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const INITIAL_VIEW_STATE = {
  longitude: -51.9253,
  latitude: -14.235,
  zoom: 4,
  pitch: 0,
  bearing: 0
};

const LocationSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  // Search using Nominatim API
  const searchLocation = useCallback(async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: 20,
          addressdetails: 1,
          extratags: 1
        },
        headers: {
          'User-Agent': 'OlhosDeDeusGeoKit/1.0'
        }
      });
      
      const data = response.data.map((item, index) => ({
        ...item,
        id: `${item.place_id}-${index}`,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon)
      }));
      
      setResults(data);
      
      // Add to history
      setSearchHistory(prev => [
        { query, timestamp: new Date().toISOString(), count: data.length },
        ...prev.slice(0, 9)
      ]);
      
      // Fly to first result
      if (data.length > 0) {
        flyToLocation(data[0]);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Erro ao buscar localização. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  // Fly to location
  const flyToLocation = useCallback((location) => {
    setSelectedResult(location);
    setViewState({
      longitude: location.lon,
      latitude: location.lat,
      zoom: 14,
      pitch: 45,
      bearing: 0,
      transitionDuration: 2000,
      transitionInterpolator: new FlyToInterpolator()
    });
  }, []);

  // Reverse geocoding - get address from coordinates
  const reverseGeocode = useCallback(async (lat, lon) => {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat,
          lon,
          format: 'json',
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'OlhosDeDeusGeoKit/1.0'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return null;
    }
  }, []);

  // Export results
  const exportResults = useCallback(() => {
    const data = {
      query,
      timestamp: new Date().toISOString(),
      results: results.map(r => ({
        name: r.display_name,
        latitude: r.lat,
        longitude: r.lon,
        type: r.type,
        importance: r.importance
      }))
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'location-search-results.json';
    link.click();
  }, [query, results]);

  // Deck.GL layers
  const layers = [
    // Results points
    results.length > 0 && new ScatterplotLayer({
      id: 'search-results',
      data: results,
      getPosition: d => [d.lon, d.lat],
      getFillColor: d => selectedResult && d.id === selectedResult.id ? 
        [255, 255, 0] : [0, 255, 0],
      getRadius: 50,
      radiusMinPixels: 5,
      radiusMaxPixels: 30,
      pickable: true,
      autoHighlight: true,
      onClick: info => flyToLocation(info.object)
    }),
    
    // Labels for top results
    results.length > 0 && new TextLayer({
      id: 'result-labels',
      data: results.slice(0, 5),
      getPosition: d => [d.lon, d.lat],
      getText: d => d.name || d.type,
      getSize: 16,
      getColor: [255, 255, 255],
      getAngle: 0,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      getPixelOffset: [0, -20]
    })
  ].filter(Boolean);

  return (
    <div className="location-search-tool">
      <div className="search-layout">
        {/* Search Panel */}
        <div className="search-panel">
          <div className="search-header">
            <h2><Search size={24} /> Busca Global de Localizações</h2>
            <p>Pesquise endereços, cidades, POIs em todo o mundo</p>
          </div>

          {/* Search Box */}
          <div className="search-input-group">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input 
                type="text"
                className="search-input"
                placeholder="Ex: Cristo Redentor, Rio de Janeiro..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
              />
            </div>
            <button 
              className="search-button"
              onClick={searchLocation}
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? (
                <><Loader2 className="spin" size={20} /> Buscando...</>
              ) : (
                <><Search size={20} /> Buscar</>
              )}
            </button>
          </div>

          {/* Quick Searches */}
          <div className="quick-searches">
            <h4>Buscas Rápidas:</h4>
            <div className="quick-btns">
              {[
                'Torre Eiffel, Paris',
                'Times Square, New York',
                'Cristo Redentor, Rio',
                'Big Ben, London',
                'Sagrada Familia, Barcelona'
              ].map(place => (
                <button 
                  key={place}
                  className="quick-btn"
                  onClick={() => {
                    setQuery(place);
                    setTimeout(() => searchLocation(), 100);
                  }}
                >
                  {place.split(',')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Results List */}
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
                  <div 
                    key={result.id}
                    className={`result-card ${selectedResult && result.id === selectedResult.id ? 'selected' : ''}`}
                    onClick={() => flyToLocation(result)}
                  >
                    <div className="result-rank">#{index + 1}</div>
                    <div className="result-content">
                      <h4>{result.display_name}</h4>
                      <div className="result-meta">
                        <span className="result-type">{result.type}</span>
                        <span className="result-coords">
                          {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
                        </span>
                      </div>
                      {result.address && (
                        <div className="result-address">
                          {result.address.country && `🏳️ ${result.address.country}`}
                          {result.address.state && ` • ${result.address.state}`}
                        </div>
                      )}
                    </div>
                    <MapPin className="result-icon" size={20} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="search-history">
              <h4>📜 Histórico Recente:</h4>
              <div className="history-list">
                {searchHistory.map((item, index) => (
                  <button 
                    key={index}
                    className="history-item"
                    onClick={() => {
                      setQuery(item.query);
                      setTimeout(() => searchLocation(), 100);
                    }}
                  >
                    <Search size={14} />
                    <span>{item.query}</span>
                    <small>{item.count} results</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="search-map-container">
          <DeckGL
            initialViewState={INITIAL_VIEW_STATE}
            viewState={viewState}
            controller={true}
            layers={layers}
            onViewStateChange={({viewState}) => setViewState(viewState)}
          >
            <Map
              mapStyle={MAP_STYLE}
              mapLib={import('maplibre-gl')}
            />
          </DeckGL>

          {results.length === 0 && (
            <div className="map-placeholder">
              <Navigation size={64} />
              <h3>Nenhuma busca realizada</h3>
              <p>Digite um local e clique em "Buscar"</p>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="search-info">
        <h3>🌍 Powered by OpenStreetMap Nominatim</h3>
        <ul>
          <li>✓ Busca global em mais de 220 países</li>
          <li>✓ Geocoding e reverse geocoding</li>
          <li>✓ POIs, endereços, cidades, monumentos</li>
          <li>✓ Dados atualizados do OpenStreetMap</li>
        </ul>
      </div>
    </div>
  );
};

export default LocationSearch;