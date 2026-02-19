import React, { useState } from 'react';
import { Shield, Search, Bug, AlertTriangle, FileSearch, Link as LinkIcon, Skull, Mail } from 'lucide-react';
import './Boitata.css';

const BoitataTools = () => {
  const [selectedTool, setSelectedTool] = useState('ghacking');

  const tools = {
    ghacking: {
      name: 'Google Hacking',
      icon: <Search size={32} />,
      color: '#00ff41',
      description: 'Google Dorks e técnicas avançadas de busca',
      links: [
        { name: 'Google Hacking Database', url: 'https://www.exploit-db.com/google-hacking-database' },
        { name: 'Google Advanced Search', url: 'https://www.google.com/advanced_search' },
        { name: 'Shodan', url: 'https://www.shodan.io/' },
        { name: 'Censys', url: 'https://censys.io/' },
      ]
    },
    osint: {
      name: 'OSINT Tools',
      icon: <FileSearch size={32} />,
      color: '#0099ff',
      description: 'Ferramentas de inteligência de fontes abertas',
      links: [
        { name: 'Maltego', url: 'https://www.maltego.com/' },
        { name: 'SpiderFoot', url: 'https://www.spiderfoot.net/' },
        { name: 'theHarvester', url: 'https://github.com/laramies/theHarvester' },
        { name: 'OSINT Framework', url: 'https://osintframework.com/' },
        { name: 'IntelTechniques', url: 'https://inteltechniques.com/tools/' },
      ]
    },
    recon: {
      name: 'Reconhecimento',
      icon: <Shield size={32} />,
      color: '#ff0066',
      description: 'Ferramentas de reconhecimento e enumeração',
      links: [
        { name: 'Nmap', url: 'https://nmap.org/' },
        { name: 'Sublist3r', url: 'https://github.com/aboul3la/Sublist3r' },
        { name: 'Amass', url: 'https://github.com/OWASP/Amass' },
        { name: 'Recon-ng', url: 'https://github.com/lanmaster53/recon-ng' },
        { name: 'DNSdumpster', url: 'https://dnsdumpster.com/' },
      ]
    },
    clickjacking: {
      name: 'Clickjacking Test',
      icon: <LinkIcon size={32} />,
      color: '#ffcc00',
      description: 'Teste de vulnerabilidade Clickjacking',
      content: (
        <div className="tool-content">
          <h3>Teste de Clickjacking</h3>
          <p>Clickjacking é uma técnica maliciosa onde um atacante engana usuários para clicar em algo diferente do que eles percebem.</p>
          
          <div className="test-section">
            <h4>Como Testar:</h4>
            <ol>
              <li>Cole a URL do site alvo abaixo</li>
              <li>O site será carregado em um iframe</li>
              <li>Se o site carregar = VULNERÁVEL</li>
              <li>Se bloquear = PROTEGIDO</li>
            </ol>
            
            <div className="clickjacking-tester">
              <input 
                type="url" 
                placeholder="https://exemplo.com" 
                className="url-input"
              />
              <button className="test-btn">TESTAR</button>
            </div>
          </div>
          
          <div className="info-box">
            <h4>Proteção:</h4>
            <code>X-Frame-Options: DENY</code>
            <code>Content-Security-Policy: frame-ancestors 'none'</code>
          </div>
        </div>
      )
    },
    bugbounty: {
      name: 'Bug Bounty',
      icon: <Bug size={32} />,
      color: '#00d4ff',
      description: 'Plataformas de Bug Bounty e recursos',
      links: [
        { name: 'HackerOne', url: 'https://www.hackerone.com/' },
        { name: 'Bugcrowd', url: 'https://www.bugcrowd.com/' },
        { name: 'Intigriti', url: 'https://www.intigriti.com/' },
        { name: 'YesWeHack', url: 'https://www.yeswehack.com/' },
        { name: 'Open Bug Bounty', url: 'https://www.openbugbounty.org/' },
      ]
    },
    cve: {
      name: 'CVE Database',
      icon: <AlertTriangle size={32} />,
      color: '#ff6b35',
      description: 'Bases de dados de vulnerabilidades',
      links: [
        { name: 'CVE MITRE', url: 'https://cve.mitre.org/' },
        { name: 'NVD - NIST', url: 'https://nvd.nist.gov/' },
        { name: 'Exploit-DB', url: 'https://www.exploit-db.com/' },
        { name: 'Vulners', url: 'https://vulners.com/' },
        { name: 'CVE Details', url: 'https://www.cvedetails.com/' },
      ]
    },
    malware: {
      name: 'Malware Sandbox',
      icon: <Skull size={32} />,
      color: '#9d00ff',
      description: 'Análise de malware em sandbox',
      links: [
        { name: 'VirusTotal', url: 'https://www.virustotal.com/' },
        { name: 'Any.Run', url: 'https://any.run/' },
        { name: 'Hybrid Analysis', url: 'https://www.hybrid-analysis.com/' },
        { name: 'Joe Sandbox', url: 'https://www.joesandbox.com/' },
        { name: 'Cuckoo Sandbox', url: 'https://cuckoosandbox.org/' },
      ]
    },
    phishing: {
      name: 'Phishing Analysis',
      icon: <Mail size={32} />,
      color: '#ff0066',
      description: 'Análise de URLs e emails suspeitos',
      links: [
        { name: 'URLScan.io', url: 'https://urlscan.io/' },
        { name: 'PhishTank', url: 'https://phishtank.org/' },
        { name: 'Google Safe Browsing', url: 'https://transparencyreport.google.com/safe-browsing/search' },
        { name: 'VirusTotal URL', url: 'https://www.virustotal.com/gui/home/url' },
      ]
    }
  };

  const currentTool = tools[selectedTool];

  return (
    <div className="boitata-page">
      <header className="boitata-header">
        <h1>🐍 BOITATÁ TOOLKIT</h1>
        <p>Coleção completa de ferramentas de segurança ofensiva</p>
      </header>

      <div className="tools-nav">
        {Object.entries(tools).map(([key, tool]) => (
          <button
            key={key}
            className={`tool-nav-btn ${selectedTool === key ? 'active' : ''}`}
            onClick={() => setSelectedTool(key)}
            style={{ borderColor: tool.color }}
          >
            {tool.icon}
            <span>{tool.name}</span>
          </button>
        ))}
      </div>

      <div className="tool-display">
        <div className="tool-header" style={{ borderColor: currentTool.color }}>
          {currentTool.icon}
          <div>
            <h2>{currentTool.name}</h2>
            <p>{currentTool.description}</p>
          </div>
        </div>

        <div className="tool-body">
          {currentTool.content ? (
            currentTool.content
          ) : (
            <div className="links-grid">
              {currentTool.links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-card"
                  style={{ borderColor: currentTool.color }}
                >
                  <LinkIcon size={20} />
                  <span>{link.name}</span>
                  <div className="link-arrow">→</div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="boitata-footer">
        <p>⚠️ Use estas ferramentas apenas para fins legais e éticos</p>
        <p>🐍 Inspirado em Boitatá - A serpente de fogo da mitologia brasileira</p>
      </div>
    </div>
  );
};

export default BoitataTools;
