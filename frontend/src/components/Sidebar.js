import React from 'react';
import { 
  Menu, Shield, Search, Home, Lock, Image, Compass, BookOpen, 
  FileText, Globe, Terminal, Users, Target, Database, Code, TrendingUp, Eye, LogOut, Zap, Crown, RadioReceiver, ShieldAlert, FolderSearch, Network, Share2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ currentPage, onPageChange }) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);

  const menuItems = [
    { id: 'home', name: 'Início', icon: Home },
    ...(user?.role === 'admin' ? [{ id: 'admin', name: 'Admin', icon: Crown, badge: 'ADMIN' }] : []),
    { id: 'manual', name: 'Manual', icon: BookOpen, badge: 'NOVO' },
    { id: 'pentester', name: 'Pentester', icon: Shield },
    { id: 'username-search', name: 'Usuários', icon: Users, badge: 'NOVO' },
    { id: 'face-recognition', name: 'Face IA', icon: Eye, badge: 'NOVO' },
    { id: 'generators', name: 'Geradores', icon: Database, badge: 'NOVO' },
    { id: 'payload-gen', name: 'Payloads', icon: Terminal, badge: 'NOVO' },
    { id: 'api-tester', name: 'API Security', icon: Code, badge: 'NOVO' },
    { id: 'data-viz', name: 'Data Viz', icon: TrendingUp, badge: 'NOVO' },
    { id: 'website-cloner', name: 'Cloner', icon: Globe, badge: 'NOVO' },
    { id: 'reverse-image', name: 'Rev. Imagem', icon: Target, badge: 'NOVO' },
    { id: 'exploit-tester', name: 'Exploits', icon: Zap, badge: 'NOVO' },
    { id: 'osint', name: 'OSINT Dorks', icon: Search },
    { id: 'framework', name: 'Framework', icon: Compass },
    { id: 'boitata', name: 'Boitatá', icon: Terminal },
    { id: 'academy', name: 'Academy', icon: BookOpen },
    { id: 'exif', name: 'EXIF Hunter', icon: Image },
    { id: 'emoji', name: 'Emoji-Crypt', icon: Lock },
    { id: 'cookie-catcher', name: 'Cookie Catcher', icon: Shield, badge: 'NOVO' },
    { id: 'web-scraper', name: 'Web Scraper', icon: Database, badge: 'NOVO' },
    { id: 'waf-detector', name: 'WAF Detector', icon: ShieldAlert, badge: 'NOVO' },
    { id: 'request-catcher', name: 'Request Catcher', icon: RadioReceiver, badge: 'NOVO' },
    { id: 'dir-buster', name: 'DirBuster', icon: FolderSearch, badge: 'NOVO' },
    { id: 'port-scanner', name: 'Port Scanner', icon: Network, badge: 'NOVO' },
    { id: 'subdomain-mapper', name: 'Subdomain Mapper', icon: Share2, badge: 'NOVO' },
    { id: 'geokit', name: 'GeoKit', icon: Globe },
    { id: 'reports', name: 'Relatórios', icon: FileText }
  ];

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button 
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu size={18} />
        </button>
        {!collapsed && (
          <div className="sidebar-brand">
            <Eye size={20} />
            <span>Olhos de Deus</span>
          </div>
        )}
      </div>

      <div className="sidebar-user">
        <div className="sidebar-avatar">
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        {!collapsed && (
          <div className="sidebar-user-info">
            <span className="sidebar-username">{user?.username || 'Usuário'}</span>
            <span className="sidebar-role">Operador</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id || (item.id === 'home' && currentPage === 'dashboard');
          return (
            <button
              key={item.id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => onPageChange(item.id === 'home' ? 'dashboard' : item.id)}
              title={item.name}
            >
              <Icon size={18} />
              {!collapsed && (
                <>
                  <span className="sidebar-item-text">{item.name}</span>
                  {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                </>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <button className="sidebar-logout" onClick={logout} title="Sair">
          <LogOut size={18} />
          {!collapsed && <span>Sair</span>}
        </button>
        <div className="sidebar-online">
          <span className="online-dot" />
          {!collapsed && <span>Online</span>}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;