import React, { useState } from 'react';
import axios from 'axios';
import { FileText, ShieldAlert, Download, Search, AlertTriangle, Info, Terminal, Upload, FileSearch, Anchor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './PDFHacking.css';

const PDFHacking = () => {
  const { token } = useAuth();
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canaryUrl, setCanaryUrl] = useState('');
  const [canaryFilename, setCanaryFilename] = useState('urgente_doc.pdf');
  const [activeTab, setActiveTab] = useState('analyzer'); // 'analyzer' or 'canary'

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setAnalysis(null);
  };

  const analyzePdf = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await axios.post(`${API_URL}/api/tools/pdf/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAnalysis(resp.data);
    } catch (err) {
      alert("Erro ao analisar PDF");
    } finally {
      setLoading(false);
    }
  };

  const generateCanary = async () => {
    if (!canaryUrl) {
      alert("Insira uma URL de Tracking (Webhook)");
      return;
    }
    setLoading(true);
    try {
      const resp = await axios.post(`${API_URL}/api/tools/pdf/generate-tracking`, {
        webhook_url: canaryUrl,
        filename: canaryFilename
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', canaryFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Erro ao gerar PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-hacking-page">
      <header className="page-header">
        <h1><FileSearch size={32} /> PDF HACKING SUITE</h1>
        <p>Análise de indicadores de infraestrutura e geração de documentos de rastreio</p>
      </header>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'analyzer' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyzer')}
        >
          <Search size={18} /> PDF ANALYZER
        </button>
        <button 
          className={`tab-btn ${activeTab === 'canary' ? 'active' : ''}`}
          onClick={() => setActiveTab('canary')}
        >
          <Anchor size={18} /> CANARY PDF (TRACKER)
        </button>
      </div>

      {activeTab === 'analyzer' ? (
        <div className="tool-section">
          <div className="upload-box card">
            <h2>🔎 ANALISADOR DE METADADOS & RISCOS</h2>
            <p>Suba um arquivo PDF para extrair informações ocultas e detectar scripts.</p>
            
            <div className="file-input-wrapper">
              <input type="file" accept=".pdf" onChange={handleFileChange} id="pdf-upload" />
              <label htmlFor="pdf-upload" className="upload-label">
                <Upload size={20} />
                {file ? file.name : "Selecionar arquivo PDF"}
              </label>
            </div>

            <button className="btn-primary" onClick={analyzePdf} disabled={!file || loading}>
              {loading ? "ANALISANDO..." : "INICIAR ANÁLISE"}
            </button>
          </div>

          {analysis && (
            <div className="analysis-results grid-2">
              <div className="metadata-card card">
                <h3><Info size={18} /> METADADOS ENCONTRADOS</h3>
                <div className="meta-list">
                  {Object.entries(analysis.metadata).map(([key, val]) => (
                    <div key={key} className="meta-item">
                      <span className="meta-key">{key}:</span>
                      <span className="meta-val">{val}</span>
                    </div>
                  ))}
                </div>
                <div className="file-stats">
                  <span>Páginas: {analysis.page_count}</span>
                  <span>Tamanho: {analysis.size_kb.toFixed(2)} KB</span>
                </div>
              </div>

              <div className="risks-card card">
                <h3><ShieldAlert size={18} /> INDICADORES DE RISCO</h3>
                {analysis.risks.length > 0 ? (
                  <div className="risks-list">
                    {analysis.risks.map((risk, i) => (
                      <div key={i} className={`risk-item ${risk.level}`}>
                        <AlertTriangle size={16} />
                        <span>{risk.msg}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-risks">
                    <CheckCircle size={32} className="icon-success" />
                    <p>Nenhum script ou ação automática detected.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="tool-section">
          <div className="canary-config card">
            <h2>🎣 GERADOR DE PDF CANÁRIO</h2>
            <p>Crie um arquivo PDF que sinaliza a abertura para o seu Webhook.</p>
            
            <div className="form-group">
              <label>URL do Webhook (Dica: Use o Request Catcher)</label>
              <input 
                type="text" 
                value={canaryUrl} 
                onChange={(e) => setCanaryUrl(e.target.value)}
                placeholder="https://seu-servidor.com/hook/xyz"
              />
            </div>

            <div className="form-group">
              <label>Nome do Arquivo Isca</label>
              <input 
                type="text" 
                value={canaryFilename} 
                onChange={(e) => setCanaryFilename(e.target.value)}
                placeholder="documento_vazado.pdf"
              />
            </div>

            <button className="btn-success" onClick={generateCanary} disabled={loading}>
              <Download size={18} /> {loading ? "GERANDO..." : "GERAR & BAIXAR PDF"}
            </button>

            <div className="usage-tip">
              <Terminal size={16} />
              <span>
                <strong>Instruções de Uso:</strong>
                1. Vá até a aba <strong>Request Catcher</strong> e gere uma URL.
                2. Cole a URL no campo acima.
                3. Gere o PDF e envie/abra.
                <br /><br />
                <strong>Nota Técnica:</strong> Navegadores modernos (Chrome/Edge) costumam bloquear gatilhos automáticos. Para maior eficácia, o alvo deve abrir o arquivo no <strong>Adobe Acrobat</strong> ou clicar em qualquer lugar da página do PDF gerado.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CheckCircle = ({size, className}) => <svg className={className} width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

export default PDFHacking;
