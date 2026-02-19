import React, { useState } from 'react';
import { Image as ImageIcon, Upload, FileSearch, Trash2, Download, ExternalLink } from 'lucide-react';
import './ExifHunter.css';

const ExifHunter = () => {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fotoForensicsUrl, setFotoForensicsUrl] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeWithFotoForensics = () => {
    if (!imageUrl.trim()) {
      alert('Por favor, insira uma URL de imagem válida');
      return;
    }
    
    setLoading(true);
    
    // FotoForensics aceita URLs diretamente
    const forensicsUrl = `https://fotoforensics.com/analysis.php?id=${encodeURIComponent(imageUrl)}&fmt=ela`;
    setFotoForensicsUrl(forensicsUrl);
    
    // Abrir em nova aba
    window.open(forensicsUrl, '_blank');
    
    setTimeout(() => setLoading(false), 1000);
  };

  const analyzeUploadedImage = async () => {
    if (!imageFile) {
      alert('Por favor, faça upload de uma imagem primeiro');
      return;
    }

    setLoading(true);
    
    // Para imagens locais, precisamos upload para algum servidor público
    // Ou usar a URL da imagem se estiver hospedada
    alert('📌 Para análise completa, hospede sua imagem online e use a opção "Analisar por URL".\n\nOu abra https://fotoforensics.com e faça upload manualmente.');
    
    setLoading(false);
  };

  const clear = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl('');
    setFotoForensicsUrl('');
  };

  return (
    <div className="exif-hunter">
      <header className="page-header">
        <h1>
          <ImageIcon size={32} />
          EXIF HUNTER
        </h1>
        <p>Extrator de Metadados de Imagens - Descubra informações ocultas</p>
      </header>

      <div className="analysis-methods">
        <div className="method-card">
          <h3>📤 MÉTODO 1: Analisar por URL</h3>
          <p>Insira a URL de uma imagem pública para análise completa com FotoForensics</p>
          <div className="url-input-group">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
              className="url-input"
            />
            <button 
              className="btn-analyze" 
              onClick={analyzeWithFotoForensics}
              disabled={loading || !imageUrl.trim()}
            >
              <FileSearch size={20} />
              {loading ? 'ANALISANDO...' : 'ANALISAR COM FOTOFORENSICS'}
            </button>
          </div>
          {fotoForensicsUrl && (
            <a 
              href={fotoForensicsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="forensics-link"
            >
              <ExternalLink size={16} />
              Ver análise completa no FotoForensics
            </a>
          )}
        </div>

        <div className="method-divider">OU</div>

        <div className="method-card">
          <h3>📁 MÉTODO 2: Upload de Arquivo</h3>
          <p>Faça upload de uma imagem do seu dispositivo</p>
          <div className="upload-section-inline">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              id="file-input"
              hidden
            />
            <label htmlFor="file-input" className="upload-btn">
              <Upload size={20} />
              {imageFile ? imageFile.name : 'SELECIONAR IMAGEM'}
            </label>
            {imageFile && (
              <button className="btn-analyze-upload" onClick={analyzeUploadedImage}>
                <FileSearch size={20} />
                ANALISAR
              </button>
            )}
          </div>
          {imagePreview && (
            <div className="preview-inline">
              <img src={imagePreview} alt="Preview" />
            </div>
          )}
        </div>
      </div>

      {(imageFile || imageUrl) && (
        <button className="btn-clear-all" onClick={clear}>
          <Trash2 size={20} /> LIMPAR TUDO
        </button>
      )}

      <div className="info-section">
        <h3>💡 SOBRE FOTOFORENSICS</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>🔬 Análise ELA (Error Level Analysis)</h4>
            <p>
              FotoForensics usa ELA para identificar áreas de uma imagem que foram modificadas.
              Áreas com diferentes níveis de compressão indicam manipulação.
            </p>
          </div>
          <div className="info-card">
            <h4>📊 Metadados EXIF Completos</h4>
            <p>
              Extrai TODOS os metadados: GPS, câmera, software, configurações, timestamps.
              Revela informações que muitas vezes são esquecidas ao compartilhar fotos.
            </p>
          </div>
          <div className="info-card">
            <h4>🖼️ Análise de Thumbnail</h4>
            <p>
              Verifica miniatura embutida que pode conter informações diferentes da imagem principal.
              Útil para detectar edições.
            </p>
          </div>
          <div className="info-card">
            <h4>🔐 Privacidade & Segurança</h4>
            <p>
              SEMPRE remova metadados sensíveis antes de publicar fotos online.
              GPS pode revelar sua localização exata, incluindo sua casa.
            </p>
          </div>
        </div>
      </div>

      <div className="fotoforensics-features">
        <h3>🎯 O QUE FOTOFORENSICS REVELA</h3>
        <div className="features-grid">
          <div className="feature-item">✅ Coordenadas GPS (latitude/longitude)</div>
          <div className="feature-item">✅ Fabricante e modelo da câmera</div>
          <div className="feature-item">✅ Data e hora exatas da captura</div>
          <div className="feature-item">✅ Configurações: ISO, abertura, velocidade</div>
          <div className="feature-item">✅ Software usado para edição</div>
          <div className="feature-item">✅ Dimensões originais vs atuais</div>
          <div className="feature-item">✅ Análise de manipulação (ELA)</div>
          <div className="feature-item">✅ Histórico de edições</div>
          <div className="feature-item">✅ Copyright e autor</div>
          <div className="feature-item">✅ Miniatura embutida</div>
        </div>
      </div>

      <div className="usage-tips">
        <h3>📋 COMO USAR</h3>
        <ol>
          <li><strong>Método 1 (Recomendado):</strong> Cole a URL de uma imagem pública e clique em "Analisar com FotoForensics"</li>
          <li><strong>Método 2:</strong> Faça upload e depois hospede a imagem online para análise completa</li>
          <li><strong>Análise:</strong> FotoForensics abrirá em nova aba mostrando todos os metadados e análise ELA</li>
          <li><strong>Interpretação:</strong> Áreas mais brilhantes no ELA indicam possível manipulação recente</li>
        </ol>
      </div>
    </div>
  );
};

export default ExifHunter;
