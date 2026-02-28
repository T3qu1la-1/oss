import React, { useState } from 'react';
import { Globe, Map, Upload, Search, Target, Layers, Satellite, Image as ImageIcon } from 'lucide-react';
import InteractiveMap from './components/InteractiveMap';
import GeoClipTool from './components/GeoClipTool';
import LocationSearch from './components/LocationSearch';
import CoordinatesAnalyzer from './components/CoordinatesAnalyzer';
import SatelliteView from './components/SatelliteView';
import './GeoKit.css';

const GeoKit = () => {
  const [activeTab, setActiveTab] = useState('map');

  const tabs = [
    { id: 'map', name: 'Mapa 3D', icon: Globe, color: '#00ff00' },
    { id: 'geoclip', name: 'GeoClip AI', icon: Upload, color: '#00ffff' },
    { id: 'search', name: 'Busca Global', icon: Search, color: '#ff00ff' },
    { id: 'coords', name: 'Coordenadas', icon: Target, color: '#ffff00' },
    { id: 'satellite', name: 'Satélite', icon: Satellite, color: '#ff6600' },
  ];

  return (
    <div className="geokit-container">
      {/* Epic Header */}
      <header className="geokit-header">
        <div className="header-bg-pattern"></div>
        <div className="header-content">
          <div className="title-group">
            <Globe className="title-icon" size={48} />
            <h1 className="geokit-title">
              <span className="text-gradient-1">GEO</span>
              <span className="text-gradient-2">KIT</span>
            </h1>
          </div>
          <p className="geokit-subtitle">
            <span className="pulse-dot"></span>
            PLATAFORMA PROFISSIONAL DE GEOLOCALIZAÇÃO & OSINT GEOGRÁFICO
          </p>
          <div className="geokit-credits">
            <small>
              🌍 Powered by <a href="https://github.com/JettChenT/earthkit" target="_blank" rel="noopener noreferrer">EarthKit</a> | 
              GPL v3 License | 
              Adapted for <strong>Olhos De Deus</strong>
            </small>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="geokit-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`geokit-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                '--tab-color': tab.color
              }}
            >
              <Icon size={24} />
              <span>{tab.name}</span>
              {activeTab === tab.id && <div className="tab-indicator"></div>}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="geokit-content">
        <div className="content-wrapper">
          {activeTab === 'map' && <InteractiveMap />}
          {activeTab === 'geoclip' && <GeoClipTool />}
          {activeTab === 'search' && <LocationSearch />}
          {activeTab === 'coords' && <CoordinatesAnalyzer />}
          {activeTab === 'satellite' && <SatelliteView />}
        </div>
      </div>
    </div>
  );
};

export default GeoKit;
