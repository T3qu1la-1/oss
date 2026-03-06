import React, { useEffect, useRef } from 'react';
import { Terminal, Code, Shield, Eye, Send } from 'lucide-react';
import './LandingPage.css';

const LandingPage = ({ onNavigate }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = '01';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    function draw() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f0';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    const interval = setInterval(draw, 33);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="landing-minimal">
      <canvas ref={canvasRef} className="matrix-bg" />
      
      <div className="landing-content">
        <div className="terminal-window">
          <div className="terminal-header">
            <span className="dot red"></span>
            <span className="dot yellow"></span>
            <span className="dot green"></span>
            <span className="terminal-title">OLHOS_DE_DEUS.exe</span>
          </div>
          
          <div className="terminal-body">
            <div className="terminal-line">
              <span className="prompt">root@system:~$</span>
              <span className="command"> ./initialize_system</span>
            </div>
            
            <div className="system-output">
              <p className="typing-effect">[OK] Loading security modules...</p>
              <p className="typing-effect delay-1">[OK] Initializing OSINT framework...</p>
              <p className="typing-effect delay-2">[OK] System ready.</p>
            </div>

            <div className="main-content">
              <div className="logo-section">
                <Eye className="logo-icon" size={80} />
                <h1 className="system-title glitch" data-text="OLHOS DE DEUS">
                  OLHOS DE DEUS
                </h1>
              </div>

              <div className="description">
                <p className="mono-text">
                  &gt; PLATAFORMA PROFISSIONAL DE PENTESTING E OSINT
                </p>
                <p className="mono-text">
                  &gt; 14+ FERRAMENTAS ESPECIALIZADAS
                </p>
                <p className="mono-text">
                  &gt; SCANNER DE VULNERABILIDADES AVANÇADO
                </p>
                <p className="mono-text">
                  &gt; PROTEÇÃO CONTRA DDOS E PAYLOADS MALICIOSOS
                </p>
              </div>

              <div className="features-grid">
                <div className="feature-item">
                  <Shield size={24} />
                  <span>PENTESTING</span>
                </div>
                <div className="feature-item">
                  <Terminal size={24} />
                  <span>OSINT</span>
                </div>
                <div className="feature-item">
                  <Code size={24} />
                  <span>EXPLOITS</span>
                </div>
                <div className="feature-item">
                  <Eye size={24} />
                  <span>RECON</span>
                </div>
              </div>

              <div className="developer-section">
                <div className="scan-line"></div>
                <h2 className="developer-title">&gt; DESENVOLVEDOR</h2>
                <div className="developer-info">
                  <p className="mono-text">NOME: TEQU1LA</p>
                </div>
                <div className="scan-line" style={{margin: '1rem 0'}}></div>
                <h3 className="developer-title" style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}>&gt; ESTATÍSTICAS DO PROJETO</h3>
                <div className="developer-info" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem'}}>
                  <div style={{padding: '0.75rem', background: 'rgba(0, 255, 65, 0.05)', border: '1px solid var(--primary)', borderRadius: '4px'}}>
                    <p className="mono-text" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>PYTHON</p>
                    <p className="mono-text" style={{fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 'bold'}}>5,049</p>
                    <p className="mono-text" style={{fontSize: '0.75rem', color: '#666'}}>linhas</p>
                  </div>
                  <div style={{padding: '0.75rem', background: 'rgba(0, 255, 65, 0.05)', border: '1px solid var(--primary)', borderRadius: '4px'}}>
                    <p className="mono-text" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>JAVASCRIPT/JSX</p>
                    <p className="mono-text" style={{fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 'bold'}}>10,640</p>
                    <p className="mono-text" style={{fontSize: '0.75rem', color: '#666'}}>linhas</p>
                  </div>
                  <div style={{padding: '0.75rem', background: 'rgba(0, 255, 65, 0.05)', border: '1px solid var(--primary)', borderRadius: '4px'}}>
                    <p className="mono-text" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>CSS</p>
                    <p className="mono-text" style={{fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 'bold'}}>5,400</p>
                    <p className="mono-text" style={{fontSize: '0.75rem', color: '#666'}}>linhas</p>
                  </div>
                  <div style={{padding: '0.75rem', background: 'rgba(0, 255, 65, 0.1)', border: '2px solid var(--primary)', borderRadius: '4px'}}>
                    <p className="mono-text" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>TOTAL</p>
                    <p className="mono-text" style={{fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 'bold'}}>21,089</p>
                    <p className="mono-text" style={{fontSize: '0.75rem', color: '#666'}}>linhas de código</p>
                  </div>
                </div>
                <div className="developer-info" style={{marginTop: '1rem'}}>
                  <p className="mono-text" style={{fontSize: '0.8rem', color: '#888'}}>
                    ARQUIVOS: 13 Python | 82 JavaScript/JSX | 17 CSS
                  </p>
                  <p className="mono-text" style={{fontSize: '0.8rem', color: '#888', marginTop: '0.5rem'}}>
                    SEGURANÇA: Rate Limiting | Input Validation | TLS Protection
                  </p>
                </div>
              </div>

              <div className="actions">
                <button className="btn-terminal" onClick={() => onNavigate('login')}>
                  [ LOGIN ]
                </button>
                <button className="btn-terminal btn-primary" onClick={() => onNavigate('register')}>
                  [ REGISTRAR ]
                </button>
                <button 
                  className="btn-terminal" 
                  onClick={() => onNavigate('telegram-login')}
                  style={{ 
                    background: 'rgba(0, 191, 255, 0.1)', 
                    borderColor: '#00bfff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Send size={18} />
                  [ LOGIN VIA TELEGRAM ]
                </button>
              </div>

              <div className="footer-text">
                <p className="mono-text small">USO ÉTICO APENAS - TESTES AUTORIZADOS</p>
                <p className="mono-text small">&copy; 2026 OLHOS DE DEUS - ALL RIGHTS RESERVED</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;