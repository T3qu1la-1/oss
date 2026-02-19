import React from 'react';
import { Shield, Search, Activity, AlertTriangle, Lock, Image, Compass } from 'lucide-react';
import './Dashboard.css';

const Dashboard = ({ onNavigate }) => {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">
          <span className="glitch" data-text="OLHOS DE DEUS">OLHOS <span className="highlight">DE DEUS</span></span>
        </h1>
        <p className="dashboard-subtitle">
          <Shield size={20} /> PLATAFORMA PROFISSIONAL DE SEGURANÇA & OSINT
        </p>
      </header>

      <div className="tools-grid">
        <div className="tool-card pentester" onClick={() => onNavigate('pentester')}>
          <div className="tool-icon">
            <Shield size={48} />
          </div>
          <h2>PENTESTER</h2>
          <p>Scanner avançado de vulnerabilidades</p>
          <ul className="tool-features">
            <li>✓ Detecção de SQL Injection</li>
            <li>✓ Scanner XSS</li>
            <li>✓ Verificação de Headers</li>
            <li>✓ Análise SSL/TLS</li>
            <li>✓ CORS Misconfiguration</li>
          </ul>
          <button className="tool-btn">INICIAR SCANNER →</button>
        </div>

        <div className="tool-card osint" onClick={() => onNavigate('osint')}>
          <div className="tool-icon">
            <Search size={48} />
          </div>
          <h2>OSINT DORKS</h2>
          <p>Google dorking & reconhecimento</p>
          <ul className="tool-features">
            <li>✓ 150+ Dorks Pré-configurados</li>
            <li>✓ Construtor Customizado</li>
            <li>✓ Modo Cyber Intel</li>
            <li>✓ Modo File Hunter</li>
            <li>✓ Exportar & Compartilhar</li>
          </ul>
          <button className="tool-btn">INICIAR FERRAMENTA →</button>
        </div>

        <div className="tool-card framework" onClick={() => onNavigate('framework')}>
          <div className="tool-icon">
            <Compass size={48} />
          </div>
          <h2>OSINT FRAMEWORK</h2>
          <p>Coleção completa de ferramentas OSINT</p>
          <ul className="tool-features">
            <li>✓ 150+ Ferramentas</li>
            <li>✓ 16 Categorias</li>
            <li>✓ Links Diretos</li>
            <li>✓ Busca Integrada</li>
            <li>✓ Constantemente Atualizado</li>
          </ul>
          <button className="tool-btn">EXPLORAR →</button>
        </div>

        <div className="tool-card emoji" onClick={() => onNavigate('emoji')}>
          <div className="tool-icon">
            <Lock size={48} />
          </div>
          <h2>EMOJI-CRYPT</h2>
          <p>Esteganografia com emojis</p>
          <ul className="tool-features">
            <li>✓ Criptografar Mensagens</li>
            <li>✓ Descriptografar Emojis</li>
            <li>✓ Mapeamento Completo</li>
            <li>✓ Copiar/Exportar</li>
            <li>✓ Mensagens Secretas</li>
          </ul>
          <button className="tool-btn">ACESSAR →</button>
        </div>

        <div className="tool-card exif" onClick={() => onNavigate('exif')}>
          <div className="tool-icon">
            <Image size={48} />
          </div>
          <h2>EXIF HUNTER</h2>
          <p>Extrator de metadados de imagens</p>
          <ul className="tool-features">
            <li>✓ Extrair Metadados EXIF</li>
            <li>✓ GPS & Localização</li>
            <li>✓ Info da Câmera</li>
            <li>✓ Data/Hora Original</li>
            <li>✓ Exportar Relatório</li>
          </ul>
          <button className="tool-btn">ANALISAR →</button>
        </div>
      </div>

      <div className="stats-section">
        <h3><Activity size={20} /> STATUS DO SISTEMA</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🔒</div>
            <div className="stat-info">
              <div className="stat-number">SEGURO</div>
              <div className="stat-label">Modo</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-info">
              <div className="stat-number">ONLINE</div>
              <div className="stat-label">Status</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🛡️</div>
            <div className="stat-info">
              <div className="stat-number">v5.0</div>
              <div className="stat-label">Versão</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-info">
              <div className="stat-number">5</div>
              <div className="stat-label">Ferramentas</div>
            </div>
          </div>
        </div>
      </div>

      <div className="warning-box">
        <AlertTriangle size={20} />
        <div>
          <strong>USO ÉTICO APENAS</strong>
          <p>Estas ferramentas são destinadas apenas a testes de segurança autorizados e pesquisa. O acesso não autorizado a sistemas é ilegal.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
