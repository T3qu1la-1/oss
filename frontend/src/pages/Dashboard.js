import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Search, Users, Database, Terminal, Code, TrendingUp, Globe, 
  Target, Eye, BookOpen, Image, Lock, FileText, Zap, ArrowRight
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = ({ onNavigate }) => {
  const tools = [
    { id: 'pentester', name: 'Pentester Pro', icon: Shield, desc: 'Scanner de vulnerabilidades avançado', tag: 'Segurança' },
    { id: 'username-search', name: 'Busca de Usuários', icon: Users, desc: 'Busca em 300+ plataformas', tag: 'Novo' },
    { id: 'face-recognition', name: 'Reconhecimento Facial', icon: Eye, desc: 'Análise facial com IA', tag: 'Novo' },
    { id: 'generators', name: 'Geradores', icon: Database, desc: 'Gerador de dados BR', tag: 'Novo' },
    { id: 'payload-gen', name: 'Payload Generator', icon: Terminal, desc: 'Biblioteca de exploits', tag: 'Novo' },
    { id: 'api-tester', name: 'API Security', icon: Code, desc: 'Teste de REST/GraphQL', tag: 'Novo' },
    { id: 'data-viz', name: 'Data Visualizer', icon: TrendingUp, desc: 'Mapeamento de redes', tag: 'Novo' },
    { id: 'website-cloner', name: 'Website Cloner', icon: Globe, desc: 'Clone e análise de sites', tag: 'Novo' },
    { id: 'reverse-image', name: 'Busca Reversa', icon: Target, desc: 'Busca multi-engine por imagem', tag: 'Novo' },
    { id: 'exploit-tester', name: 'Exploit Tester', icon: Zap, desc: 'Teste automatizado de exploits', tag: 'Novo' },
    { id: 'osint', name: 'OSINT Dorks', icon: Search, desc: 'Google Dorking avançado', tag: 'OSINT' },
    { id: 'framework', name: 'OSINT Framework', icon: Globe, desc: '200+ ferramentas OSINT', tag: 'OSINT' },
    { id: 'academy', name: 'Academy', icon: BookOpen, desc: 'Centro de aprendizado', tag: 'Educação' },
    { id: 'exif', name: 'EXIF Hunter', icon: Image, desc: 'Extração de metadados', tag: 'Análise' },
    { id: 'emoji', name: 'Emoji-Crypt', icon: Lock, desc: 'Esteganografia digital', tag: 'Cripto' },
    { id: 'geokit', name: 'GeoKit', icon: Globe, desc: 'Ferramentas de geolocalização', tag: 'OSINT' },
    { id: 'reports', name: 'Relatórios', icon: FileText, desc: 'Gerar relatórios de scans', tag: 'Geral' },
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.03, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
    })
  };

  return (
    <div className="dash">
      {/* Header */}
      <div className="dash-top">
        <div>
          <h1 className="dash-title">Ferramentas</h1>
          <p className="dash-subtitle">Selecione uma ferramenta para começar</p>
        </div>
        <div className="dash-status">
          <span className="dash-status-dot" />
          <span>Todos os sistemas operacionais</span>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="dash-grid">
        {tools.map((tool, i) => {
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
              <div className="dash-card-top">
                <div className="dash-card-icon">
                  <Icon size={20} />
                </div>
                <span className="dash-card-tag">{tool.tag}</span>
              </div>
              <h3 className="dash-card-name">{tool.name}</h3>
              <p className="dash-card-desc">{tool.desc}</p>
              <div className="dash-card-action">
                <span>Abrir</span>
                <ArrowRight size={14} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="dash-footer">
        <Zap size={14} />
        <span>Apenas para testes autorizados — Acesso não autorizado é ilegal</span>
      </div>
    </div>
  );
};

export default Dashboard;