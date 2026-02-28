import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { Target, Plus, Trash2, Download, Crosshair, Zap } from 'lucide-react';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const INITIAL_CENTER = [-14.235, -51.9253];
const INITIAL_ZOOM = 4;

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjMDBmZjAwIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
  iconSize: [25, 25],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

// Heatmap component
const HeatmapLayer = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    const heatData = points.map(p => [p.lat, p.lng, p.intensity || 0.5]);
    const heat = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: {
        0.0: '#00ff00',
        0.3: '#00ffff',
        0.6: '#ffff00',
        1.0: '#ff0000'
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [points, map]);

  return null;
};

// Click handler component
const MapClickHandler = ({ onMapClick, mode }) => {
  useMapEvents({
    click: (e) => {
      if (mode === 'add') {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
};

// Fly to location component
const FlyToLocation = ({ position, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, zoom || 12, { duration: 2 });
    }
  }, [position, zoom, map]);
  
  return null;
};

const InteractiveMap = () => {
  const [points, setPoints] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [mode, setMode] = useState('view');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [flyToPos, setFlyToPos] = useState(null);
  const [cursorCoords, setCursorCoords] = useState(null);
  const mapRef = useRef();

  // Add point
  const handleMapClick = useCallback((latlng) => {
    const newPoint = {
      id: Date.now(),
      lat: latlng.lat,
      lng: latlng.lng,
      name: `Ponto ${points.length + 1}`,
      timestamp: new Date().toISOString()
    };
    setPoints(prev => [...prev, newPoint]);
  }, [points.length]);

  // Generate heatmap
  const generateHeatmap = useCallback(() => {
    const data = [];
    const bounds = mapRef.current?.getBounds();
    if (!bounds) return;

    const center = bounds.getCenter();
    for (let i = 0; i < 200; i++) {
      data.push({
        lat: center.lat + (Math.random() - 0.5) * 5,
        lng: center.lng + (Math.random() - 0.5) * 5,
        intensity: Math.random()
      });
    }
    setHeatmapPoints(data);
  }, []);

  // Delete point
  const deletePoint = useCallback((id) => {
    setPoints(prev => prev.filter(p => p.id !== id));
    if (selectedPoint?.id === id) {
      setSelectedPoint(null);
    }
  }, [selectedPoint]);

  // Export points
  const exportPoints = useCallback(() => {
    const geojson = {
      type: 'FeatureCollection',
      features: points.map(point => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.lng, point.lat]
        },
        properties: {
          name: point.name,
          timestamp: point.timestamp
        }
      }))
    };
    
    const dataStr = JSON.stringify(geojson, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'geokit-points.geojson';
    link.click();
    URL.revokeObjectURL(url);
  }, [points]);

  // Fly to location
  const flyTo = useCallback((lat, lng) => {
    setFlyToPos([lat, lng]);
  }, []);

  return (
    <div className="interactive-map-tool">
      {/* Toolbar */}
      <div className="map-toolbar">
        <div className="toolbar-section">
          <h3><Target size={20} /> Controles</h3>
          <div className="button-group">
            <button 
              className={`tool-btn ${mode === 'view' ? 'active' : ''}`}
              onClick={() => setMode('view')}
            >
              <Crosshair size={18} /> Visualizar
            </button>
            <button 
              className={`tool-btn ${mode === 'add' ? 'active' : ''}`}
              onClick={() => setMode('add')}
            >
              <Plus size={18} /> Adicionar
            </button>
            <button 
              className="tool-btn"
              onClick={generateHeatmap}
            >
              <Zap size={18} /> Heatmap
            </button>
          </div>
        </div>

        <div className="toolbar-section">
          <h3>Ações</h3>
          <div className="button-group">
            <button 
              className="tool-btn"
              onClick={exportPoints}
              disabled={points.length === 0}
            >
              <Download size={18} /> Exportar
            </button>
            <button 
              className="tool-btn danger"
              onClick={() => {
                setPoints([]);
                setHeatmapPoints([]);
              }}
              disabled={points.length === 0 && heatmapPoints.length === 0}
            >
              <Trash2 size={18} /> Limpar
            </button>
          </div>
        </div>

        <div className="toolbar-section">
          <h3>🌍 Localizações</h3>
          <div className="quick-locations">
            <button onClick={() => flyTo(-14.235, -51.9253)}>Brasil</button>
            <button onClick={() => flyTo(40.7128, -74.006)}>New York</button>
            <button onClick={() => flyTo(35.6895, 139.6917)}>Tóquio</button>
            <button onClick={() => flyTo(51.5074, -0.1278)}>Londres</button>
            <button onClick={() => flyTo(48.8566, 2.3522)}>Paris</button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="map-container-leaflet">
        <MapContainer
          center={INITIAL_CENTER}
          zoom={INITIAL_ZOOM}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          <MapClickHandler onMapClick={handleMapClick} mode={mode} />
          <FlyToLocation position={flyToPos} />
          
          {heatmapPoints.length > 0 && <HeatmapLayer points={heatmapPoints} />}
          
          {points.map((point, idx) => (
            <React.Fragment key={point.id}>
              <Marker 
                position={[point.lat, point.lng]} 
                icon={customIcon}
                eventHandlers={{
                  click: () => setSelectedPoint(point)
                }}
              >
                <Popup>
                  <div style={{ color: '#000' }}>
                    <strong>{point.name}</strong><br />
                    Lat: {point.lat.toFixed(6)}<br />
                    Lng: {point.lng.toFixed(6)}
                  </div>
                </Popup>
              </Marker>
              
              {idx > 0 && (
                <Polyline 
                  positions={[
                    [points[idx - 1].lat, points[idx - 1].lng],
                    [point.lat, point.lng]
                  ]}
                  color="#00ffff"
                  weight={2}
                  opacity={0.6}
                />
              )}
            </React.Fragment>
          ))}
        </MapContainer>

        {mode === 'add' && (
          <div className="mode-indicator">
            ➕ Modo Adicionar - Clique no mapa para marcar pontos
          </div>
        )}
      </div>

      {/* Points List */}
      {points.length > 0 && (
        <div className="points-list">
          <h3>📍 Pontos Marcados ({points.length})</h3>
          <div className="points-scroll">
            {points.map(point => (
              <div 
                key={point.id} 
                className={`point-item ${selectedPoint?.id === point.id ? 'selected' : ''}`}
                onClick={() => flyTo(point.lat, point.lng)}
              >
                <div className="point-info">
                  <strong>{point.name}</strong>
                  <small>{point.lat.toFixed(4)}, {point.lng.toFixed(4)}</small>
                </div>
                <button 
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePoint(point.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="map-info-panel">
        <h3>🎯 Funcionalidades:</h3>
        <ul>
          <li>✓ Mapa interativo com Leaflet.js</li>
          <li>✓ Heatmap com gradiente de cores</li>
          <li>✓ Marcação de pontos customizados</li>
          <li>✓ Linhas conectando pontos</li>
          <li>✓ Exportação em GeoJSON</li>
          <li>✓ Quick locations (Brasil, NY, Tóquio, etc)</li>
        </ul>
      </div>
    </div>
  );
};

export default InteractiveMap;