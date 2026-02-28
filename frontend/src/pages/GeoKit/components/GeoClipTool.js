import React, { useState, useCallback, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl';
import { HeatmapLayer, ScatterplotLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from '@deck.gl/core';
import { Upload, Loader2, X, Download, Zap } from 'lucide-react';
import { bbox as turfBbox } from '@turf/turf';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const INITIAL_VIEW_STATE = {
  longitude: 0,
  latitude: 20,
  zoom: 2,
  pitch: 0,
  bearing: 0
};

const GeoClipTool = () => {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [selectedPrediction, setSelectedPrediction] = useState(null);

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
    setViewState(INITIAL_VIEW_STATE);
  }, []);

  // Simulate GeoClip analysis (mock data)
  const analyzeImage = useCallback(async () => {
    if (!image) return;
    
    setIsAnalyzing(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock predictions
    // In real implementation, this would call the GeoClip API
    const mockPredictions = generateMockPredictions();
    setPredictions(mockPredictions);
    
    // Fit bounds to predictions
    if (mockPredictions.length > 0) {
      const coordinates = mockPredictions.map(p => [p.lon, p.lat]);
      const bounds = calculateBounds(coordinates);
      
      setViewState({
        ...viewState,
        longitude: (bounds[0] + bounds[2]) / 2,
        latitude: (bounds[1] + bounds[3]) / 2,
        zoom: getBoundsZoom(bounds),
        transitionDuration: 2000,
        transitionInterpolator: new FlyToInterpolator()
      });
    }
    
    setIsAnalyzing(false);
  }, [image, viewState]);

  // Generate mock predictions
  const generateMockPredictions = () => {
    // Simulate predictions around a random location
    const baseLat = (Math.random() - 0.5) * 150;
    const baseLon = (Math.random() - 0.5) * 300;
    
    const predictions = [];
    for (let i = 0; i < 100; i++) {
      const distance = Math.random() * 5;
      const angle = Math.random() * Math.PI * 2;
      
      predictions.push({
        lat: baseLat + Math.cos(angle) * distance,
        lon: baseLon + Math.sin(angle) * distance,
        confidence: Math.random(),
        rank: i + 1
      });
    }
    
    // Sort by confidence
    return predictions.sort((a, b) => b.confidence - a.confidence);
  };

  // Calculate bounds from coordinates
  const calculateBounds = (coordinates) => {
    let minLon = Infinity, maxLon = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    coordinates.forEach(([lon, lat]) => {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });
    
    return [minLon, minLat, maxLon, maxLat];
  };

  // Get appropriate zoom level for bounds
  const getBoundsZoom = (bounds) => {
    const latDiff = bounds[3] - bounds[1];
    const lonDiff = bounds[2] - bounds[0];
    const maxDiff = Math.max(latDiff, lonDiff);
    
    if (maxDiff > 100) return 2;
    if (maxDiff > 50) return 3;
    if (maxDiff > 20) return 4;
    if (maxDiff > 10) return 5;
    if (maxDiff > 5) return 6;
    return 7;
  };

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
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'geoclip-results.json';
    link.click();
  }, [predictions, imageFile]);

  // Deck.GL layers
  const layers = useMemo(() => {
    if (!predictions) return [];
    
    return [
      // Heatmap layer
      new HeatmapLayer({
        id: 'geoclip-heatmap',
        data: predictions,
        getPosition: d => [d.lon, d.lat],
        getWeight: d => d.confidence,
        radiusPixels: 40,
        intensity: 1,
        threshold: 0.03,
        colorRange: [
          [0, 255, 0, 0],
          [0, 255, 0, 100],
          [0, 255, 255, 150],
          [255, 255, 0, 200],
          [255, 0, 0, 255]
        ]
      }),
      
      // Top predictions as points
      new ScatterplotLayer({
        id: 'top-predictions',
        data: predictions.slice(0, 10),
        getPosition: d => [d.lon, d.lat],
        getFillColor: d => [
          255 - d.rank * 20,
          255,
          d.rank * 20,
          200
        ],
        getRadius: d => 50000 / d.rank,
        radiusMinPixels: 5,
        radiusMaxPixels: 30,
        pickable: true,
        autoHighlight: true,
        onClick: info => setSelectedPrediction(info.object)
      })
    ];
  }, [predictions]);

  return (
    <div className=\"geoclip-tool\">\n      {/* Header */}\n      <div className=\"tool-header-section\">\n        <h2><Zap size={24} /> GeoClip AI - Geolocalização por Imagem</h2>\n        <p>Upload de imagem para predição de localização usando deep learning</p>\n      </div>\n\n      <div className=\"geoclip-layout\">\n        {/* Left Panel - Upload & Results */}\n        <div className=\"geoclip-sidebar\">\n          {/* Upload Area */}\n          {!image ? (\n            <div className=\"upload-zone\">\n              <input \n                type=\"file\" \n                accept=\"image/*\" \n                onChange={handleImageUpload}\n                id=\"geoclip-upload\"\n                style={{display: 'none'}}\n              />\n              <label htmlFor=\"geoclip-upload\" className=\"upload-label\">\n                <div className=\"upload-icon\">\n                  <Upload size={48} />\n                </div>\n                <h3>Upload de Imagem</h3>\n                <p>Arraste ou clique para selecionar</p>\n                <small>JPG, PNG, WebP (max 10MB)</small>\n              </label>\n            </div>\n          ) : (\n            <div className=\"image-preview-section\">\n              <div className=\"image-preview-header\">\n                <h3>Imagem Carregada</h3>\n                <button className=\"remove-btn\" onClick={removeImage}>\n                  <X size={20} />\n                </button>\n              </div>\n              \n              <div className=\"image-preview\">\n                <img src={image} alt=\"Uploaded\" />\n              </div>\n\n              <button \n                className={`analyze-button ${isAnalyzing ? 'analyzing' : ''}`}\n                onClick={analyzeImage}\n                disabled={isAnalyzing}\n              >\n                {isAnalyzing ? (\n                  <>\n                    <Loader2 className=\"spin\" size={20} />\n                    Analisando...\n                  </>\n                ) : (\n                  <>\n                    <Zap size={20} />\n                    Analisar Localização\n                  </>\n                )}\n              </button>\n            </div>\n          )}\n\n          {/* Results */}\n          {predictions && (\n            <div className=\"predictions-results\">\n              <div className=\"results-header\">\n                <h3>Top 10 Predições</h3>\n                <button className=\"export-btn\" onClick={exportResults}>\n                  <Download size={16} /> Exportar\n                </button>\n              </div>\n              \n              <div className=\"predictions-list\">\n                {predictions.slice(0, 10).map(pred => (\n                  <div \n                    key={pred.rank}\n                    className={`prediction-item ${selectedPrediction && selectedPrediction.rank === pred.rank ? 'selected' : ''}`}\n                    onClick={() => {\n                      setSelectedPrediction(pred);\n                      setViewState({\n                        ...viewState,\n                        longitude: pred.lon,\n                        latitude: pred.lat,\n                        zoom: 8,\n                        transitionDuration: 1000,\n                        transitionInterpolator: new FlyToInterpolator()\n                      });\n                    }}\n                  >\n                    <div className=\"pred-rank\">#{pred.rank}</div>\n                    <div className=\"pred-info\">\n                      <div className=\"pred-coords\">\n                        {pred.lat.toFixed(4)}, {pred.lon.toFixed(4)}\n                      </div>\n                      <div className=\"pred-confidence\">\n                        Confiança: {(pred.confidence * 100).toFixed(1)}%\n                      </div>\n                      <div className=\"confidence-bar\">\n                        <div \n                          className=\"confidence-fill\" \n                          style={{width: `${pred.confidence * 100}%`}}\n                        ></div>\n                      </div>\n                    </div>\n                  </div>\n                ))}\n              </div>\n            </div>\n          )}\n        </div>\n\n        {/* Right Panel - Map */}\n        <div className=\"geoclip-map-container\">\n          <DeckGL\n            initialViewState={INITIAL_VIEW_STATE}\n            viewState={viewState}\n            controller={true}\n            layers={layers}\n            onViewStateChange={({viewState}) => setViewState(viewState)}\n          >\n            <Map\n              mapStyle={MAP_STYLE}\n              mapLib={import('maplibre-gl')}\n            />\n          </DeckGL>\n\n          {!predictions && (\n            <div className=\"map-placeholder\">\n              <Zap size={64} />\n              <h3>Aguardando Análise</h3>\n              <p>Upload uma imagem e clique em \"Analisar Localização\"</p>\n            </div>\n          )}\n        </div>\n      </div>\n\n      {/* Info Section */}\n      <div className=\"geoclip-info\">\n        <h3>🤖 Como Funciona o GeoClip:</h3>\n        <div className=\"info-grid\">\n          <div className=\"info-card\">\n            <h4>1. Upload da Imagem</h4>\n            <p>Envie uma foto de qualquer lugar do mundo</p>\n          </div>\n          <div className=\"info-card\">\n            <h4>2. Análise com IA</h4>\n            <p>GeoClip analisa características visuais (arquitetura, vegetação, clima)</p>\n          </div>\n          <div className=\"info-card\">\n            <h4>3. Predições</h4>\n            <p>Recebe top-K localizações mais prováveis com confiança</p>\n          </div>\n          <div className=\"info-card\">\n            <h4>4. Visualização</h4>\n            <p>Heatmap interativo mostrando probabilidades</p>\n          </div>\n        </div>\n        \n        <div className=\"warning-box\">\n          ⚠️ <strong>Demo Mode:</strong> Esta é uma simulação. Para análise real, é necessário backend com modelo GeoClip.\n          O modelo real usa CLIP + embeddings geográficos para predição precisa.\n        </div>\n      </div>\n    </div>\n  );\n};\n\nexport default GeoClipTool;
