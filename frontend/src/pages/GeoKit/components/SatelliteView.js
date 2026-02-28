import React, { useState } from 'react';
import { Satellite, Zap, AlertTriangle } from 'lucide-react';

const SatelliteView = () => {
  const [mode, setMode] = useState('info');

  return (
    <div className="satellite-view-tool">
      <div className="tool-header-section">
        <h2><Satellite size={24} /> Visão Satélite & Street View</h2>
        <p>Comparação de imagens satellite e street view para geolocalização</p>
      </div>

      <div className="satellite-content">
        <div className="feature-showcase">
          <div className="showcase-icon">
            <Satellite size={128} />
          </div>
          <h3>Visão Satélite Avançada</h3>
          <p>Recurso baseado em EigenPlaces para street view e Sample4Geo para satélite</p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <Satellite size={48} />
            <h4>Geolocalização por Satélite</h4>
            <p>Usa Sample4Geo para comparação cross-view entre imagens de satélite e ground level</p>
          </div>
          
          <div className="feature-card">
            <Zap size={48} />
            <h4>Visual Place Recognition</h4>
            <p>EigenPlaces para matching de street view com alta precisão</p>
          </div>
          
          <div className="feature-card">
            <AlertTriangle size={48} />
            <h4>Status: Experimental</h4>
            <p>Requer backend Modal com modelos ML pré-carregados</p>
          </div>
        </div>

        <div className="requirements-box">
          <h3>⚙️ Requisitos Técnicos:</h3>
          <ul>
            <li>🔴 Backend Modal com GPU</li>
            <li>🔴 Modelo Sample4Geo (cross-view)</li>
            <li>🔴 Modelo EigenPlaces (street view)</li>
            <li>🔴 Base de imagens satélite e street view</li>
            <li>🔴 Tempo de cold-boot: ~2-3 minutos</li>
          </ul>

          <div className="warning-banner">
            <AlertTriangle size={24} />
            <div>
              <strong>Funcionalidade Experimental</strong>
              <p>
                Esta feature requer infraestrutura complexa do backend EarthKit original.
                Para implementação completa, seria necessário:
              </p>
              <ol>
                <li>Configurar Modal.com com GPUs</li>
                <li>Deploy dos modelos ML (Sample4Geo, EigenPlaces)</li>
                <li>Base de dados de imagens satélite e street view</li>
                <li>API endpoints para matching de imagens</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h3>🎯 Como Funcionaria:</h3>
          <div className="workflow">
            <div className="workflow-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Upload da Imagem Alvo</h4>
                <p>Usuário envia foto do local desconhecido</p>
              </div>
            </div>
            <div className="workflow-arrow">↓</div>
            <div className="workflow-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Extração de Features</h4>
                <p>Modelo extrai embeddings visuais da imagem</p>
              </div>
            </div>
            <div className="workflow-arrow">↓</div>
            <div className="workflow-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Comparação com Base</h4>
                <p>Match com milhões de imagens satélite/street view</p>
              </div>
            </div>
            <div className="workflow-arrow">↓</div>
            <div className="workflow-step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h4>Ranking de Similaridade</h4>
                <p>Top-K localizações mais prováveis com score</p>
              </div>
            </div>
          </div>
        </div>

        <div className="models-info">
          <h3>🤖 Modelos Utilizados:</h3>
          <div className="model-cards">
            <div className="model-card">
              <h4>EigenPlaces</h4>
              <p>Visual Place Recognition para ground-level</p>
              <a href="https://github.com/gmberton/EigenPlaces" target="_blank" rel="noopener noreferrer">
                Ver no GitHub →
              </a>
            </div>
            <div className="model-card">
              <h4>Sample4Geo</h4>
              <p>Cross-view geolocation (satélite ↔ ground)</p>
              <a href="https://github.com/Skyy93/Sample4Geo" target="_blank" rel="noopener noreferrer">
                Ver no GitHub →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SatelliteView;