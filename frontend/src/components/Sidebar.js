import React from 'react';
import { 
  Menu, Shield, Search, Home, Lock, Image, Compass, BookOpen, 
  FileText, Globe, Terminal, Users, Target, Database, Code, TrendingUp, Eye, LogOut, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ currentPage, onPageChange }) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);

  const menuItems = [
    { id: 'home', name: 'HOME', icon: Home },
    { id: 'pentester', name: 'PENTESTER', icon: Shield, badge: 'ACTIVE' },
    { id: 'username-search', name: 'USERNAME', icon: Users, badge: 'NEW' },
    { id: 'face-recognition', name: 'FACE AI', icon: Eye, badge: 'NEW' },
    { id: 'generators', name: 'GENERATORS', icon: Database, badge: 'NEW' },
    { id: 'payload-gen', name: 'PAYLOADS', icon: Terminal, badge: 'NEW' },
    { id: 'api-tester', name: 'API SECURITY', icon: Code, badge: 'NEW' },
    { id: 'data-viz', name: 'DATA VIZ', icon: TrendingUp, badge: 'NEW' },
    { id: 'website-cloner', name: 'CLONER', icon: Globe, badge: 'NEW' },
    { id: 'reverse-image', name: 'REV IMAGE', icon: Target, badge: 'NEW' },
    { id: 'exploit-tester', name: 'EXPLOIT TEST', icon: Zap, badge: 'NEW' },
    { id: 'osint', name: 'OSINT DORKS', icon: Search },
    { id: 'framework', name: 'OSINT FRAME', icon: Compass },
    { id: 'boitata', name: 'BOITATÁ', icon: Terminal },
    { id: 'academy', name: 'ACADEMY', icon: BookOpen },
    { id: 'exif', name: 'EXIF HUNTER', icon: Image },
    { id: 'emoji', name: 'EMOJI-CRYPT', icon: Lock },
    { id: 'geokit', name: 'GEOKIT', icon: Globe },
    { id: 'reports', name: 'REPORTS', icon: FileText }
  ];

  return (
    <div className={`sidebar-minimal ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header-minimal">
        <button 
          className="collapse-btn-minimal"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu size={20} />
        </button>
        {!collapsed && (
          <div className="sidebar-title">
            <Eye size={24} />
            <span>OLHOS DE DEUS</span>
          </div>
        )}
      </div>

      <div className="sidebar-user">
        {!collapsed ? (
          <>
            <div className="user-avatar">{user?.username?.charAt(0).toUpperCase() || 'U'}</div>
            <div className="user-info">
              <div className="user-name">{user?.username || 'USER'}</div>
              <div className="user-role">OPERATOR</div>
            </div>
          </>
        ) : (
          <div className="user-avatar-small">{user?.username?.charAt(0).toUpperCase() || 'U'}</div>
        )}
      </div>

      <nav className="sidebar-nav-minimal">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id || (item.id === 'home' && currentPage === 'dashboard');
          return (
            <button
              key={item.id}
              className={`nav-item-minimal ${isActive ? 'active' : ''}`}
              onClick={() => onPageChange(item.id === 'home' ? 'dashboard' : item.id)}
              title={item.name}
            >
              <Icon size={18} />
              {!collapsed && (
                <>
                  <span>{item.name}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer-minimal">
        <button className="logout-btn-minimal" onClick={logout} title="LOGOUT">
          <LogOut size={18} />
          {!collapsed && <span>LOGOUT</span>}
        </button>
        <div className="sidebar-status">
          <span className="status-indicator"></span>
          {!collapsed && <span>ONLINE</span>}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;