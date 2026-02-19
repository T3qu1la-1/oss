import React, { useState } from 'react';
import { Menu, Shield, Search, Home, Lock, Image, Compass, BookOpen, FileText } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ currentPage, onPageChange }) => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'home', name: 'Início', icon: Home },
    { id: 'pentester', name: 'Pentester', icon: Shield },
    { id: 'reports', name: 'Relatórios', icon: FileText },
    { id: 'osint', name: 'OSINT Dorks', icon: Search },
    { id: 'framework', name: 'OSINT Framework', icon: Compass },
    { id: 'academy', name: 'Academy', icon: BookOpen },
    { id: 'emoji', name: 'Emoji-Crypt', icon: Lock },
    { id: 'exif', name: 'EXIF Hunter', icon: Image },
  ];

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button 
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu size={24} />
        </button>
        {!collapsed && (
          <div className="logo-section">
            <img src="/logo.jpeg" alt="Logo" className="logo-img" />
            <h1 className="sidebar-title">
              <span className="text-primary">OLHOS</span> DE DEUS
            </h1>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => onPageChange(item.id)}
              title={item.name}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.name}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator">
          <span className="pulse-dot"></span>
          {!collapsed && <span>ONLINE</span>}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
