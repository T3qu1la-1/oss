import React, { useState, useCallback, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import Map from 'react-map-gl/maplibre';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from '@deck.gl/core';
import { Target, Plus, Trash2, Download, Crosshair } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';

const INITIAL_VIEW_STATE = {
  longitude: -51.9253,
  latitude: -14.235,
  zoom: 4,
  pitch: 45,
  bearing: 0
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const InteractiveMap = () => {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [points, setPoints] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [mode, setMode] = useState('view'); // view, add, heatmap
  const [cursorCoords, setCursorCoords] = useState(null);

  // Add point on click
  const handleClick = useCallback((info) => {
    if (mode === 'add' && info.coordinate) {
      const newPoint = {
        id: Date.now(),
        coordinates: info.coordinate,
        name: `Point ${points.length + 1}`,
        timestamp: new Date().toISOString()
      };
      setPoints([...points, newPoint]);
    }
  }, [mode, points]);

  // Update cursor coordinates
  const handleHover = useCallback((info) => {
    if (info.coordinate) {
      setCursorCoords(info.coordinate);
    }
  }, []);

  // Generate random heatmap data
  const generateHeatmap = useCallback(() => {
    const data = [];
    const centerLon = viewState.longitude;
    const centerLat = viewState.latitude;
    
    for (let i = 0; i < 500; i++) {
      data.push({
        position: [
          centerLon + (Math.random() - 0.5) * 10,
          centerLat + (Math.random() - 0.5) * 10
        ],
        weight: Math.random()
      });
    }
    setHeatmapData(data);
  }, [viewState]);

  // Fly to location
  const flyTo = useCallback((longitude, latitude, zoom = 12) => {
    setViewState({
      ...viewState,
      longitude,
      latitude,
      zoom,
      transitionDuration: 2000,
      transitionInterpolator: new FlyToInterpolator()
    });
  }, [viewState]);

  // Delete point
  const deletePoint = useCallback((id) => {
    setPoints(points.filter(p => p.id !== id));
  }, [points]);

  // Export points as GeoJSON
  const exportPoints = useCallback(() => {
    const geojson = {
      type: 'FeatureCollection',
      features: points.map(point => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: point.coordinates
        },
        properties: {
          name: point.name,
          timestamp: point.timestamp
        }
      }))
    };
    
    const dataStr = JSON.stringify(geojson, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'geokit-points.geojson';
    link.click();
  }, [points]);

  // Layers
  const layers = useMemo(() => [
    // Heatmap Layer
    heatmapData.length > 0 && new HeatmapLayer({
      id: 'heatmap',
      data: heatmapData,
      getPosition: d => d.position,
      getWeight: d => d.weight,
      radiusPixels: 50,
      intensity: 1,
      threshold: 0.05,
      colorRange: [
        [0, 255, 0, 0],
        [0, 255, 0, 100],
        [0, 255, 255, 150],
        [255, 255, 0, 200],
        [255, 0, 0, 255]
      ]
    }),

    // Points Layer
    points.length > 0 && new ScatterplotLayer({
      id: 'points',
      data: points,
      getPosition: d => d.coordinates,
      getFillColor: [0, 255, 0],
      getRadius: 100,
      radiusMinPixels: 5,
      radiusMaxPixels: 50,
      pickable: true,
      autoHighlight: true,
      onClick: info => setSelectedPoint(info.object),
      updateTriggers: {
        getRadius: selectedPoint ? selectedPoint.id : null
      },
      getRadius: d => selectedPoint && d.id === selectedPoint.id ? 150 : 100
    }),

    // Arc Layer (connections between points)
    points.length > 1 && new ArcLayer({
      id: 'arcs',
      data: points.slice(0, -1).map((point, i) => ({
        source: point.coordinates,
        target: points[i + 1].coordinates
      })),
      getSourcePosition: d => d.source,
      getTargetPosition: d => d.target,
      getSourceColor: [0, 255, 0],
      getTargetColor: [0, 255, 255],
      getWidth: 2
    })
  ].filter(Boolean), [points, heatmapData, selectedPoint]);

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
              title="Visualização"
            >
              <Crosshair size={18} /> Visualizar
            </button>
            <button 
              className={`tool-btn ${mode === 'add' ? 'active' : ''}`}
              onClick={() => setMode('add')}
              title="Adicionar Pontos"
            >
              <Plus size={18} /> Adicionar
            </button>
            <button 
              className="tool-btn"
              onClick={generateHeatmap}
              title="Gerar Heatmap"
            >
              <Target size={18} /> Heatmap
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
              title="Exportar GeoJSON"
            >
              <Download size={18} /> Exportar
            </button>
            <button 
              className="tool-btn danger"
              onClick={() => {
                setPoints([]);
                setHeatmapData([]);
              }}
              disabled={points.length === 0 && heatmapData.length === 0}
              title="Limpar Tudo"
            >
              <Trash2 size={18} /> Limpar
            </button>
          </div>
        </div>

        {/* Quick Locations */}
        <div className="toolbar-section">
          <h3>🌍 Localizações</h3>
          <div className="quick-locations">
            <button onClick={() => flyTo(-51.9253, -14.235, 4)}>Brasil</button>
            <button onClick={() => flyTo(-74.006, 40.7128, 10)}>New York</button>
            <button onClick={() => flyTo(139.6917, 35.6895, 10)}>Tóquio</button>
            <button onClick={() => flyTo(-0.1278, 51.5074, 10)}>Londres</button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="map-container-3d">
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller={true}
          layers={layers}
          onClick={handleClick}
          onHover={handleHover}
          onViewStateChange={({viewState}) => setViewState(viewState)}
          getCursor={() => mode === 'add' ? 'crosshair' : 'grab'}
        >
          <Map
            mapStyle={MAP_STYLE}
            
          />
        </DeckGL>

        {/* Cursor Coordinates */}
        {cursorCoords && (
          <div className="cursor-coords">
            Lat: {cursorCoords[1].toFixed(6)}, Lon: {cursorCoords[0].toFixed(6)}
          </div>
        )}

        {/* View Info */}
        <div className="view-info">
          <div>Zoom: {viewState.zoom.toFixed(2)}</div>
          <div>Pitch: {viewState.pitch.toFixed(0)}°</div>
          <div>Bearing: {viewState.bearing.toFixed(0)}°</div>
        </div>
      </div>

      {/* Points List */}
      {points.length > 0 && (
        <div className="points-list">
          <h3>📍 Pontos Marcados ({points.length})</h3>
          <div className="points-scroll">
            {points.map(point => (
              <div 
                key={point.id} 
                className={`point-item ${selectedPoint && selectedPoint.id === point.id ? 'selected' : ''}`}
                onClick={() => flyTo(point.coordinates[0], point.coordinates[1])}
              >
                <div className="point-info">
                  <strong>{point.name}</strong>
                  <small>
                    {point.coordinates[1].toFixed(4)}, {point.coordinates[0].toFixed(4)}
                  </small>
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
          <li>✓ Mapa 3D interativo com Deck.GL</li>
          <li>✓ Heatmap com gradiente de cores</li>
          <li>✓ Marcação de pontos customizados</li>
          <li>✓ Arcos conectando pontos</li>
          <li>✓ Exportação em GeoJSON</li>
          <li>✓ Controle de pitch, bearing e zoom</li>
        </ul>
      </div>
    </div>
  );
};

export default InteractiveMap;
