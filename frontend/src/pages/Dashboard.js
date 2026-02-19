import React from 'react';
import { Shield, Search, Activity, AlertTriangle } from 'lucide-react';
import './Dashboard.css';

const Dashboard = ({ onNavigate }) => {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">
          <span className="glitch" data-text="CYBERTOOLKIT">CYBER<span className="highlight">TOOLKIT</span></span>
        </h1>
        <p className="dashboard-subtitle">
          <Shield size={20} /> PROFESSIONAL SECURITY & OSINT PLATFORM
        </p>
      </header>

      <div className="tools-grid">
        <div className="tool-card pentester" onClick={() => onNavigate('pentester')}>
          <div className="tool-icon">
            <Shield size={48} />
          </div>
          <h2>PENTESTER</h2>
          <p>Advanced vulnerability scanner</p>
          <ul className="tool-features">
            <li>✓ SQL Injection Detection</li>
            <li>✓ XSS Scanner</li>
            <li>✓ Security Headers Check</li>
            <li>✓ SSL/TLS Analysis</li>
            <li>✓ CORS Misconfiguration</li>
          </ul>
          <button className="tool-btn">LAUNCH SCANNER →</button>
        </div>

        <div className="tool-card osint" onClick={() => onNavigate('osint')}>
          <div className="tool-icon">
            <Search size={48} />
          </div>
          <h2>OSINT DORKS</h2>
          <p>Google dorking & reconnaissance</p>
          <ul className="tool-features">
            <li>✓ 150+ Pre-built Dorks</li>
            <li>✓ Custom Dork Builder</li>
            <li>✓ Cyber Intel Mode</li>
            <li>✓ File Hunter Mode</li>
            <li>✓ Export & Share</li>
          </ul>
          <button className="tool-btn">LAUNCH TOOL →</button>
        </div>
      </div>

      <div className="stats-section">
        <h3><Activity size={20} /> SYSTEM STATUS</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🔒</div>
            <div className="stat-info">
              <div className="stat-number">SECURE</div>
              <div className="stat-label">Mode</div>
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
              <div className="stat-number">v4.0</div>
              <div className="stat-label">Version</div>
            </div>
          </div>
        </div>
      </div>

      <div className="warning-box">
        <AlertTriangle size={20} />
        <div>
          <strong>ETHICAL USE ONLY</strong>
          <p>These tools are for authorized security testing and research only. Unauthorized access to systems is illegal.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
