import React, { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PentesterPage from './pages/PentesterPage';
import OSINTPage from './pages/OSINTPage';
import OSINTFrameworkPage from './pages/OSINTFramework';
import EmojiCrypt from './pages/EmojiCrypt';
import ExifHunter from './pages/ExifHunter';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'pentester':
        return <PentesterPage />;
      case 'osint':
        return <OSINTPage />;
      case 'framework':
        return <OSINTFrameworkPage />;
      case 'emoji':
        return <EmojiCrypt />;
      case 'exif':
        return <ExifHunter />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="App">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="main-content">
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
