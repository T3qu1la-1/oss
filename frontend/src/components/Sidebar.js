import React, { useState } from 'react';
import { Menu, Shield, Search, Home } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ currentPage, onPageChange }) => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'home', name: 'Dashboard', icon: Home },
    { id: 'pentester', name: 'Pentester', icon: Shield },
    { id: 'osint', name: 'OSINT Dorks', icon: Search },
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
          <h1 className="sidebar-title">
            <span className="text-primary">CYBER</span>TOOLKIT
          </h1>
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
