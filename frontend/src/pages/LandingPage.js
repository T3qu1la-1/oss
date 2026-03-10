import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Zap, Send, ArrowRight, ChevronDown } from 'lucide-react';
import './LandingPage.css';

const LandingPage = ({ onNavigate }) => {
  const videoRef = useRef(null);
  // Array de vídeos que irão tocar em sequência (em loop infinito)
  const videos = [
    '/assets/hero-bg.mp4',
    '/assets/hero-bg-2.mp4'
  ];
  
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener('canplay', () => setVideoLoaded(true));
      
      const handleTimeUpdate = () => {
        // Transição rápida nos últimos frames
        if (video.duration && video.duration - video.currentTime < 0.15) {
          video.style.opacity = '0.7';
        } else if (videoLoaded) {
          video.style.opacity = '1';
        }
      };
      
      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, [videoLoaded, currentVideoIndex]);

  const handleVideoEnd = () => {
    // Quando um vídeo acaba, passa para o próximo da lista
    const nextIndex = (currentVideoIndex + 1) % videos.length;
    setCurrentVideoIndex(nextIndex);
  };

  const features = [
    { title: 'Pentesting', desc: 'Scanner de vulnerabilidades avançado com relatórios detalhados' },
    { title: 'OSINT', desc: 'Inteligência de fontes abertas com mais de 200 ferramentas' },
    { title: 'Recon', desc: 'Busca em 300+ plataformas, reconhecimento facial com IA' },
    { title: 'Criptografia', desc: 'Esteganografia, geradores de payload e análise de metadados' },
  ];

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 100, damping: 20 }
    }
  };

  const slideIn = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <div className="landing">
      {/* Background Video/Image */}
      <div className="landing-bg">
        <img
          src="/assets/hero-bg.png"
          alt=""
          className={`landing-bg-img ${videoLoaded ? 'hidden' : ''}`}
        />
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnd}
          src={videos[currentVideoIndex]}
          className={`landing-bg-video ${videoLoaded ? 'visible' : ''}`}
        >
        </video>
        <div className="landing-bg-overlay" />
      </div>

      {/* Navigation */}
      <motion.nav
        className="landing-nav"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="nav-logo">
          <img src="/assets/logo.svg" alt="Olhos de Deus" className="nav-logo-img" />
          <span>OLHOS DE DEUS</span>
        </div>
        <div className="nav-actions">
          <button className="nav-btn-ghost" onClick={() => onNavigate('login')}>
            Entrar
          </button>
          <button className="nav-btn-primary" onClick={() => onNavigate('register')}>
            Começar Agora
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="hero">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >

          <h1 className="hero-title">
            Inteligência que<br />
            <span className="hero-title-accent">tudo enxerga.</span>
          </h1>

          <div className="text-glass-box">
            <p className="hero-subtitle">
              Plataforma profissional de OSINT e Pentesting com mais de 14 ferramentas 
              especializadas para investigação digital e análise de segurança.
            </p>
          </div>

          <div className="hero-ctas">
            <button className="btn-primary-lg" onClick={() => onNavigate('register')}>
              Criar Conta Gratuita
              <ArrowRight size={18} />
            </button>
            <button className="btn-ghost-lg" onClick={() => onNavigate('telegram-login')}>
              <Send size={18} />
              Entrar via Telegram
            </button>
          </div>
        </motion.div>

        <motion.div
          className="scroll-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </section>


      {/* Features Section */}
      <section className="features-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">Ferramentas Poderosas</h2>
          <div className="text-glass-box">
            <p className="section-desc">
              Tudo que você precisa para investigação digital em um só lugar.
            </p>
          </div>
        </motion.div>

        <motion.div 
          className="features-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="feature-card glass"
                variants={fadeUp}
                whileHover={{ y: -8, scale: 1.02, transition: { type: "spring", stiffness: 300 } }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div 
                  className="feature-icon"
                  initial={{ rotate: -10 }}
                  whileHover={{ rotate: 0, scale: 1.1 }}
                >
                  <Zap size={24} />
                </motion.div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </motion.div>
            ))}
        </motion.div>
      </section>

      {/* Developer Section */}
      <section className="dev-section">
        <motion.div
          className="dev-card glass-strong"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >

          <div className="dev-tags">
            <span className="tag">Rate Limiting</span>
            <span className="tag">Input Validation</span>
            <span className="tag">TLS Protection</span>
            <span className="tag">Anti-DDoS</span>
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <motion.div
          className="cta-content"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="cta-title">Pronto para começar?</h2>
          <div className="text-glass-box">
            <p className="cta-desc">
              Crie sua conta e acesse todas as ferramentas de inteligência digital.
            </p>
          </div>
          <div className="cta-buttons">
            <button className="btn-primary-lg" onClick={() => onNavigate('register')}>
              Criar Conta
              <ArrowRight size={18} />
            </button>
            <button className="btn-ghost-lg" onClick={() => onNavigate('login')}>
              Já tenho conta
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <p className="footer-legal">Uso ético apenas — Testes autorizados</p>
          <p className="footer-copy">© 2026 Olhos de Deus. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;