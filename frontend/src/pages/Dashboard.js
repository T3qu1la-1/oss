import React from 'react';
import { 
  Shield, Search, Users, Database, Terminal, Code, TrendingUp, Globe, 
  Target, Eye, BookOpen, Image, Lock, FileText, Zap, Activity
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = ({ onNavigate }) => {
  const tools = [
    { id: 'pentester', name: 'PENTESTER PRO', icon: Shield, desc: 'Vulnerability Scanner', status: 'ACTIVE' },
    { id: 'username-search', name: 'USERNAME SEARCH', icon: Users, desc: '300+ Platforms', status: 'NEW' },
    { id: 'face-recognition', name: 'FACE RECOGNITION', icon: Eye, desc: 'AI Analysis', status: 'NEW' },
    { id: 'generators', name: 'GERADORES UTILS', icon: Database, desc: 'BR Data Generator', status: 'NEW' },
    { id: 'payload-gen', name: 'PAYLOAD GENERATOR', icon: Terminal, desc: 'Exploit Library', status: 'NEW' },
    { id: 'api-tester', name: 'API SECURITY', icon: Code, desc: 'REST/GraphQL Testing', status: 'NEW' },
    { id: 'data-viz', name: 'DATA VISUALIZER', icon: TrendingUp, desc: 'Network Mapping', status: 'NEW' },
    { id: 'website-cloner', name: 'WEBSITE CLONER', icon: Globe, desc: 'Clone & Phishing', status: 'NEW' },
    { id: 'reverse-image', name: 'REVERSE IMAGE', icon: Target, desc: 'Multi-Engine Search', status: 'NEW' },
    { id: 'osint', name: 'OSINT DORKS', icon: Search, desc: 'Google Dorking', status: 'ACTIVE' },
    { id: 'framework', name: 'OSINT FRAMEWORK', icon: Globe, desc: '200+ Tools', status: 'ACTIVE' },
    { id: 'academy', name: 'ACADEMY', icon: BookOpen, desc: 'Learning Center', status: 'ACTIVE' },
    { id: 'exif', name: 'EXIF HUNTER', icon: Image, desc: 'Metadata Extraction', status: 'ACTIVE' },
    { id: 'emoji', name: 'EMOJI-CRYPT', icon: Lock, desc: 'Steganography', status: 'ACTIVE' },
    { id: 'geokit', name: 'GEOKIT', icon: Globe, desc: 'Geolocation Tools', status: 'ACTIVE' },
    { id: 'reports', name: 'REPORTS', icon: FileText, desc: 'Generate Reports', status: 'ACTIVE' }
  ];

  const stats = [
    { label: 'SCANS', value: '1,234', icon: Zap },
    { label: 'VULNS', value: '89', icon: Shield },
    { label: 'APIS', value: '456', icon: Code },
    { label: 'USERS', value: '2.5K', icon: Users }
  ];

  return (
    <div className="dashboard-minimal">
      {/* Header */}
      <div className="dash-header">
        <div className="terminal-prompt">
          <span className="prompt-user">root@olhos-de-deus</span>
          <span className="prompt-separator">:</span>
          <span className="prompt-path">~/dashboard</span>
          <span className="prompt-symbol">$</span>
        </div>
        <div className="system-status">
          <span className="status-dot"></span>
          <span>ALL SYSTEMS OPERATIONAL</span>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-item">
              <Icon size={20} />
              <div className="stat-info">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="dash-content">
        <div className="section-title">
          <Activity size={20} />
          <span>AVAILABLE TOOLS</span>
          <div className="title-line"></div>
        </div>

        <div className="tools-grid-minimal">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div 
                key={tool.id} 
                className="tool-card-minimal"
                onClick={() => onNavigate(tool.id)}
              >
                {tool.status === 'NEW' && <div className="tool-badge-new">NEW</div>}
                <div className="tool-header">
                  <Icon size={32} />
                  <span className="tool-status">[{tool.status}]</span>
                </div>
                <div className="tool-name">{tool.name}</div>
                <div className="tool-desc">&gt; {tool.desc}</div>
                <div className="tool-action">
                  <span>EXECUTE</span>
                  <span className="arrow">&gt;&gt;</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Warning */}
      <div className="dash-warning">
        <div className="warning-border"></div>
        <div className="warning-content">
          <Zap size={18} />
          <span>WARNING: FOR AUTHORIZED TESTING ONLY - UNAUTHORIZED ACCESS IS ILLEGAL</span>
        </div>
        <div className="warning-border"></div>
      </div>
    </div>
  );
};

export default Dashboard;