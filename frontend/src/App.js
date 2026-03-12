import React, { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import protection from './protection';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TelegramLoginPage from './pages/TelegramLoginPage';
import Dashboard from './pages/Dashboard';
import PentesterPage from './pages/PentesterPage';
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
import ExploitTester from './pages/ExploitTester';
import CookieCatcher from './pages/CookieCatcher';
import WebScraper from './pages/WebScraper';
import RequestCatcher from './pages/RequestCatcher';
import WafDetector from './pages/WafDetector';
import DirBuster from './pages/DirBuster';
import PortScanner from './pages/PortScanner';
import SubdomainMapper from './pages/SubdomainMapper';
import AdminPanel from './pages/AdminPanel';
import Manual from './pages/Manual';
import PhishingGenerator from './pages/PhishingGenerator';
import PDFHacking from './pages/PDFHacking';
import Sidebar from './components/Sidebar';
import './styles/global.css';
import './App.css';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState(user ? 'dashboard' : 'landing');

  // 🚫 Ativar proteção contra inspeção
  useEffect(() => {
    protection.init();
    
    // Registrar visita
    try {
      fetch('http://localhost:8000/api/admin/visits/track', { method: 'POST' }).catch(() => {});
    } catch(e) {}
  }, []);

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
    if (currentPage === 'telegram-login') {
      return <TelegramLoginPage onNavigate={setCurrentPage} onLoginSuccess={() => window.location.reload()} />;
    }
    return <LandingPage onNavigate={setCurrentPage} />;
  }

  // Privado - com autenticação (Dashboard)
  const renderDashboardPage = () => {
    switch (currentPage) {
      case 'dashboard':
      case 'home':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'admin':
        return <AdminPanel />;
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
      case 'exploit-tester':
        return <ExploitTester />;
      case 'cookie-catcher':
        return <CookieCatcher />;
      case 'web-scraper':
        return <WebScraper />;
      case 'request-catcher':
        return <RequestCatcher />;
      case 'waf-detector':
        return <WafDetector />;
      case 'dir-buster':
        return <DirBuster />;
      case 'port-scanner':
        return <PortScanner />;
      case 'subdomain-mapper':
        return <SubdomainMapper />;
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
      case 'phishing':
        return <PhishingGenerator />;
      case 'pdf-hacking':
        return <PDFHacking />;
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
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
        <Toaster 
          position="top-right" 
          richColors 
          closeButton 
          duration={4000}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
