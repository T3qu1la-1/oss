import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import PentesterPage from './pages/PentesterPage';
import Reports from './pages/Reports';
import OSINTPage from './pages/OSINTPage';
import OSINTFrameworkPage from './pages/OSINTFramework';
import BoitataTools from './pages/BoitataTools';
import Academy from './pages/Academy';
import EmojiCrypt from './pages/EmojiCrypt';
import ExifHunter from './pages/ExifHunter';
import GeoKit from './pages/GeoKit/index';
import UsernameSearch from './pages/UsernameSearch';
import Generators from './pages/Generators';
import PayloadGenerator from './pages/PayloadGenerator';
import APITester from './pages/APITester';
import DataVisualizer from './pages/DataVisualizer';
import WebsiteCloner from './pages/WebsiteCloner';
import ReverseImageSearch from './pages/ReverseImageSearch';
import FaceRecognition from './pages/FaceRecognition';
import Sidebar from './components/Sidebar';
import './styles/global.css';
import './App.css';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState(user ? 'dashboard' : 'landing');

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  // Público - sem autenticação
  if (!user) {
    if (currentPage === 'login') {
      return <LoginPage onNavigate={setCurrentPage} />;
    }
    if (currentPage === 'register') {
      return <RegisterPage onNavigate={setCurrentPage} />;
    }
    return <LandingPage onNavigate={setCurrentPage} />;
  }

  // Privado - com autenticação (Dashboard)
  const renderDashboardPage = () => {
    switch (currentPage) {
      case 'dashboard':
      case 'home':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'pentester':
        return <PentesterPage />;
      case 'username-search':
        return <UsernameSearch />;
      case 'face-recognition':
        return <FaceRecognition />;
      case 'generators':
        return <Generators />;
      case 'payload-gen':
        return <PayloadGenerator />;
      case 'api-tester':
        return <APITester />;
      case 'data-viz':
        return <DataVisualizer />;
      case 'website-cloner':
        return <WebsiteCloner />;
      case 'reverse-image':
        return <ReverseImageSearch />;
      case 'reports':
        return <Reports />;
      case 'osint':
        return <OSINTPage />;
      case 'framework':
        return <OSINTFrameworkPage />;
      case 'boitata':
        return <BoitataTools />;
      case 'geokit':
        return <GeoKit />;
      case 'academy':
        return <Academy />;
      case 'emoji':
        return <EmojiCrypt />;
      case 'exif':
        return <ExifHunter />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="dashboard-content">
        {renderDashboardPage()}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
