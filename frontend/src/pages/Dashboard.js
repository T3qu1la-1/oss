import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Search, Users, Database, Terminal, Code, TrendingUp, Globe, 
  Target, Eye, BookOpen, Image, Lock, FileText, Zap, ArrowRight, RadioReceiver, ShieldAlert, FolderSearch, Network, Share2
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = ({ onNavigate }) => {
  const categories = {
    hacker: {
      title: "Hacker",
      subtitle: "Ataque e Exploração",
      icon: Zap,
      tools: [
        { id: 'payload-gen', name: 'Payload Generator', icon: Terminal, desc: 'Biblioteca de exploits e oneliners' },
        { id: 'exploit-tester', name: 'Exploit Tester', icon: Zap, desc: 'Teste automatizado de vulnerabilidades' },
        { id: 'web-scraper', name: 'Web Scraper', icon: Database, desc: 'Extração profunda de código e assets' },
        { id: 'waf-detector', name: 'WAF Detector', icon: ShieldAlert, desc: 'Detecção de firewall e proteções' },
        { id: 'request-catcher', name: 'Request Catcher', icon: RadioReceiver, desc: 'Interceptação e análise de requests' },
        { id: 'data-viz', name: 'Data Visualizer', icon: TrendingUp, desc: 'Mapeamento interativo de redes' },
        { id: 'website-cloner', name: 'Website Cloner', icon: Globe, desc: 'Clone local e análise de sites' },
      ]
    },
    pentester: {
      title: "Pentester",
      subtitle: "Auditoria e Segurança",
      icon: Shield,
      tools: [
        { id: 'pentester', name: 'Pentester Pro', icon: Shield, desc: 'Scanner DAST multithread avançado' },
        { id: 'api-tester', name: 'API Security', icon: Code, desc: 'Auditoria de endpoints REST/GraphQL' },
        { id: 'dir-buster', name: 'DirBuster', icon: FolderSearch, desc: 'Fuzzer de diretórios e arquivos sensíveis' },
        { id: 'port-scanner', name: 'Port Scanner', icon: Network, desc: 'Scan de portas com banner grabbing' },
        { id: 'cookie-catcher', name: 'Cookie Catcher', icon: Lock, desc: 'Extração e decodificação de cookies' },
        { id: 'subdomain-mapper', name: 'Subdomain Mapper', icon: Share2, desc: 'Dumping de Data Lake CT (Censys)' },
      ]
    },
    osint: {
      title: "OSINT",
      subtitle: "Inteligência em Fontes Abertas",
      icon: Search,
      tools: [
        { id: 'osint', name: 'OSINT Dorks', icon: Search, desc: 'Google/Shodan Dorking automatizado' },
        { id: 'framework', name: 'OSINT Framework', icon: Globe, desc: 'Ecossistema com 200+ ferramentas' },
        { id: 'username-search', name: 'Busca de Usuários', icon: Users, desc: 'Recon em 300+ plataformas globais' },
        { id: 'face-recognition', name: 'Face IA', icon: Eye, desc: 'Reconhecimento facial com inteligência artificial' },
        { id: 'geokit', name: 'GeoKit', icon: Globe, desc: 'Mapeamento e triangulação de coordenadas' },
        { id: 'exif', name: 'EXIF Hunter', icon: Image, desc: 'Extração profunda de metadados' },
        { id: 'reverse-image', name: 'Busca Reversa', icon: Target, desc: 'Rastreio multi-engine por imagem' },
      ]
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
    })
  };

  return (
    <div className="dash">
      {/* Header Informativo */}
      <div className="dash-hero">
        <div className="dash-hero-content">
          <h1 className="dash-hero-title">Olhos de Deus <span>OSINT & Security</span></h1>
          <p className="dash-hero-desc">
            A plataforma definitiva para Inteligência de Fontes Abertas, Testes de Intrusão e Segurança Ofensiva. 
            Selecione uma categoria abaixo para acessar o arsenal completo de ferramentas especializadas.
          </p>
        </div>
        <div className="dash-hero-status">
          <div className="status-indicator">
            <span className="pulse-dot active"></span>
            Engines Operacionais
          </div>
          <div className="status-indicator">
            <span className="pulse-dot active"></span>
            Rust Security Core OK
          </div>
        </div>
      </div>

      {/* Categorized Tools Sections */}
      <div className="dash-categories-container">
        {Object.entries(categories).map(([key, category], index) => {
          const CategoryIcon = category.icon;
          return (
            <div key={key} className="dash-category-section">
              <div className="dash-category-header">
                <div className="dash-category-icon" data-type={key}>
                  <CategoryIcon size={24} />
                </div>
                <div>
                  <h2 className="dash-category-title">{category.title}</h2>
                  <p className="dash-category-subtitle">{category.subtitle}</p>
                </div>
              </div>

              <div className="dash-grid category-grid">
                {category.tools.map((tool, i) => {
                  const Icon = tool.icon;
                  return (
                    <motion.div
                      key={tool.id}
                      className="dash-card"
                      custom={i}
                      initial="hidden"
                      animate="visible"
                      variants={fadeUp}
                      onClick={() => onNavigate(tool.id)}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    >
                      <div className="dash-card-icon">
                        <Icon size={20} />
                      </div>
                      <div className="dash-card-content">
                        <h3 className="dash-card-name">{tool.name}</h3>
                        <p className="dash-card-desc">{tool.desc}</p>
                        <div className="dash-card-action">
                          <span>Acessar</span>
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="dash-footer">
        <Zap size={14} />
        <span>Apenas para testes autorizados — Acesso não autorizado é ilegal e monitorado.</span>
      </div>
    </div>
  );
};

export default Dashboard;