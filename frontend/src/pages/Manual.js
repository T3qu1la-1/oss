import React, { useState } from 'react';
import { BookOpen, Shield, Globe, Terminal, FileText, Anchor, Activity, Image, Zap } from 'lucide-react';
import './ToolPages.css';
import './Manual.css';

// Fallback icon definition since some aren't imported explicitly above
const Archive = ({size, className}) => <svg className={className} width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const Share2 = ({size, className}) => <svg className={className} width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>;

const toolsDoc = [
  {
    category: "OSINT & Reconnaissance",
    items: [
      {
        id: "web-scraper",
        name: "Web Scraper",
        icon: <Globe size={24} className="icon-blue" />,
        description: "Extrai arquitetura completa de um alvo web.",
        features: [
          "Captura links, mídias, cookies, e metadados vitais.",
          "Extrai vídeos ocultos em iframes (YouTube, Vimeo).",
          "Analisa as requisições e a estrutura do HTML Raw e Assets."
        ],
        usage: "Coloque uma URL (ex: https://site.com) e navegue pelas abas para visualizar o interior do site sem renderizá-lo."
      },
      {
        id: "dir-buster",
        name: "DirBuster Web",
        icon: <Archive size={24} className="icon-orange" />, // fallback icon
        description: "Fuzzer focado em diretórios e arquivos sensíveis.",
        features: [
          "Bate contra wordlists assíncronas no backend.",
          "Procura por arquivos .env, .git, painéis de admin, backups.",
          "Exibe HTTP Status e tamanho para identificar arquivos interessantes."
        ],
        usage: "Ideal para descobrir painéis ocultos que o desenvolvedor esqueceu de proteger."
      },
      {
        id: "subdomain-mapper",
        name: "Subdomain Mapper",
        icon: <Share2 size={24} className="icon-purple" />, // fallback
        description: "Mapeador passivo de subdomínios via OSINT (crt.sh).",
        features: [
          "Acha ambiente de homologação (dev.site.com, staging.site.com).",
          "Não toca o servidor do alvo, totalmente furtivo.",
          "Retorna os CNAMEs ou IP associados aos subdomínios válidos."
        ],
        usage: "Insira apenas o domínio base (ex: google.com). Ajuda a expandir a superfície de ataque."
      }
    ]
  },
  {
    category: "Network & Security Assess",
    items: [
      {
        id: "port-scanner",
        name: "Port Scanner",
        icon: <Activity size={24} className="icon-red" />,
        description: "Scanner TCP assíncrono para mapear portas abertas.",
        features: [
          "Verifica rapidamente as Top 20 portas TCP.",
          "Faz banner grabbing se o serviço retornar um payload.",
          "Identifica portas expostas indevidamente (RDP, FTP, Telnet)."
        ],
        usage: "Insira IP ou Domínio. Cuidado para não rodar contra hosts não autorizados."
      },
      {
        id: "waf-detector",
        name: "WAF Detector",
        icon: <Shield size={24} className="icon-green" />,
        description: "Identifica a presença de Web Application Firewalls.",
        features: [
          "Usa heurística para cruzar cookies e HTTP Headers.",
          "Identifica marcas comuns (Cloudflare, Imperva, Sucuri).",
          "Tenta burlar requests vazios/maliciosos para ver o block page."
        ],
        usage: "Rodar antes de injetar payloads. Se o WAF estiver ativo, os payloads falharão."
      }
    ]
  },
  {
    category: "Offensive / Social Eng.",
    items: [
      {
        id: "request-catcher",
        name: "Request Catcher",
        icon: <Anchor size={24} className="icon-purple" />,
        description: "Buraco Negro para interceptação (OOB).",
        features: [
          "Gera um link armadilha dedicado.",
          "Captura todas as headers, IP e método de quem clica.",
          "Utilizado para coletar IP do alvo (Phishing/Engenharia Social) ou para bind shells SSRF."
        ],
        usage: "Copie o Hook Link. Mande pro alvo. Fique observando o painel de capturas."
      },
      {
        id: "website-cloner",
        name: "Website Cloner",
        icon: <Zap size={24} className="icon-blue" />,
        description: "Faz o clone estático e estrutural do site.",
        features: [
          "Baixa HTML bruto.",
          "Possui opção Avançada para empacotar em ZIP (CSS, JS, Imagens).",
          "Permite clonar sub-páginas inteiras recursivamente."
        ],
        usage: "Usado para analisar o código do site offline ou criar landpages falsas. Use o botão Baixar ZIP."
      }
    ]
  }
];

const Manual = () => {
  const [activeCategory, setActiveCategory] = useState(toolsDoc[0].category);

  return (
    <div className='tool-page manual-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <BookOpen size={32} />
          <div>
            <h1>MANUAL RESTRITO</h1>
            <p>&gt; Documentação de Ferramentas OSINT & Rede</p>
          </div>
        </div>
      </div>

      <div className="manual-layout">
        <div className="manual-sidebar">
           {toolsDoc.map((sec, i) => (
             <button 
               key={i} 
               className={`manual-cat-btn ${activeCategory === sec.category ? 'active' : ''}`}
               onClick={() => setActiveCategory(sec.category)}
             >
                {sec.category}
             </button>
           ))}
        </div>

        <div className="manual-content">
           {toolsDoc.map((sec, i) => (
             <div key={i} style={{ display: activeCategory === sec.category ? 'block' : 'none' }}>
               <h2 className="manual-category-title">{sec.category}</h2>
               
               <div className="manual-grid">
                 {sec.items.map((tool, j) => (
                   <div key={j} className="manual-card">
                      <div className="manual-card-header">
                        {tool.icon}
                        <h3>{tool.name}</h3>
                      </div>
                      <p className="manual-desc">{tool.description}</p>
                      
                      <div className="manual-section">
                        <h4>Funcionalidades:</h4>
                        <ul>
                          {tool.features.map((feat, k) => <li key={k}>{feat}</li>)}
                        </ul>
                      </div>
                      
                      <div className="manual-usage">
                        <Terminal size={14} />
                        <span><strong>Uso:</strong> {tool.usage}</span>
                      </div>
                   </div>
                 ))}
               </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default Manual;
