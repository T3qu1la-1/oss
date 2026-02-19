import React, { useState } from 'react';
import { Image as ImageIcon, Upload, FileSearch, Trash2, ExternalLink, CheckCircle } from 'lucide-react';
import EXIF from 'exif-js';
import './ExifHunter.css';

const ExifHunter = () => {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fotoForensicsUrl, setFotoForensicsUrl] = useState('');
  const [exifData, setExifData] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setExifData(null);
    }
  };

  const extractLocalExif = () => {
    if (!imageFile) {
      alert('Por favor, faça upload de uma imagem primeiro');
      return;
    }

    setLoading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      
      img.onload = () => {
        EXIF.getData(img, function() {
          const allTags = EXIF.getAllTags(this);
          
          const extractedData = {
            'Nome do Arquivo': imageFile.name,
            'Tipo': imageFile.type,
            'Tamanho': `${(imageFile.size / 1024).toFixed(2)} KB`,
            'Última Modificação': new Date(imageFile.lastModified).toLocaleString('pt-BR'),
            'Dimensões': `${img.width} x ${img.height} pixels`,
          };

          // EXIF Tags
          if (allTags.Make) extractedData['Fabricante'] = allTags.Make;
          if (allTags.Model) extractedData['Modelo da Câmera'] = allTags.Model;
          if (allTags.DateTime) extractedData['Data/Hora Original'] = allTags.DateTime;
          if (allTags.DateTimeOriginal) extractedData['Data/Hora de Captura'] = allTags.DateTimeOriginal;
          if (allTags.Software) extractedData['Software'] = allTags.Software;
          if (allTags.Orientation) extractedData['Orientação'] = allTags.Orientation;
          
          // Camera settings
          if (allTags.FNumber) extractedData['Abertura (F-stop)'] = `f/${allTags.FNumber}`;
          if (allTags.ExposureTime) extractedData['Tempo de Exposição'] = `${allTags.ExposureTime} seg`;
          if (allTags.ISOSpeedRatings) extractedData['ISO'] = allTags.ISOSpeedRatings;
          if (allTags.FocalLength) extractedData['Distância Focal'] = `${allTags.FocalLength}mm`;
          if (allTags.Flash) extractedData['Flash'] = allTags.Flash === 0 ? 'Não disparado' : 'Disparado';
          if (allTags.WhiteBalance) extractedData['Balanço de Branco'] = allTags.WhiteBalance;
          
          // GPS Data
          if (allTags.GPSLatitude && allTags.GPSLongitude) {
            const lat = convertDMSToDD(allTags.GPSLatitude, allTags.GPSLatitudeRef);
            const lon = convertDMSToDD(allTags.GPSLongitude, allTags.GPSLongitudeRef);
            extractedData['GPS Latitude'] = lat.toFixed(6);
            extractedData['GPS Longitude'] = lon.toFixed(6);
            extractedData['Localização (Google Maps)'] = `https://www.google.com/maps?q=${lat},${lon}`;
          }
          
          if (allTags.GPSAltitude) extractedData['Altitude GPS'] = `${allTags.GPSAltitude}m`;
          
          // Copyright and Author
          if (allTags.Copyright) extractedData['Copyright'] = allTags.Copyright;
          if (allTags.Artist) extractedData['Autor'] = allTags.Artist;
          
          // Additional info
          if (allTags.ImageDescription) extractedData['Descrição'] = allTags.ImageDescription;
          if (allTags.LensModel) extractedData['Modelo da Lente'] = allTags.LensModel;

          if (Object.keys(extractedData).length <= 5) {
            extractedData['⚠️ Aviso'] = 'Poucos metadados EXIF encontrados. A imagem pode ter sido processada ou não possui dados EXIF.';
          }

          setExifData(extractedData);
          setLoading(false);
        });
      };
    };
    
    reader.readAsDataURL(imageFile);
  };

  const convertDMSToDD = (dms, ref) => {
    let dd = dms[0] + dms[1]/60 + dms[2]/3600;
    if (ref === 'S' || ref === 'W') {
      dd = dd * -1;
    }
    return dd;
  };

  const analyzeWithFotoForensics = () => {
    if (!imageUrl.trim()) {
      alert('Por favor, insira uma URL de imagem válida');
      return;
    }
    
    setLoading(true);
    
    const forensicsUrl = `https://fotoforensics.com/analysis.php?id=${encodeURIComponent(imageUrl)}&fmt=ela`;
    setFotoForensicsUrl(forensicsUrl);
    
    window.open(forensicsUrl, '_blank');
    
    setTimeout(() => setLoading(false), 1000);
  };

  const clear = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl('');
    setFotoForensicsUrl('');
    setExifData(null);
  };

  const downloadReport = () => {
    if (!exifData) return;
    
    let report = 'EXIF HUNTER - RELATÓRIO DE METADADOS\n';
    report += '='.repeat(50) + '\n\n';
    
    Object.entries(exifData).forEach(([key, value]) => {
      report += `${key}: ${value}\n`;
    });
    
    report += '\n' + '='.repeat(50) + '\n';
    report += 'Relatório gerado por: OLHOS DE DEUS - EXIF Hunter\n';
    report += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
    
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exif_report_${Date.now()}.txt`;
    a.click();
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
          <h3>📁 MÉTODO 2: Upload de Arquivo + Extração EXIF Real</h3>
          <p>Faça upload de uma imagem para extrair TODOS os metadados EXIF localmente</p>
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
              <button className="btn-analyze-upload" onClick={extractLocalExif} disabled={loading}>
                <FileSearch size={20} />
                {loading ? 'EXTRAINDO...' : 'EXTRAIR EXIF'}
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

      {exifData && (
        <div className="metadata-section">
          <div className="metadata-header">
            <div className="success-badge">
              <CheckCircle size={20} />
              <span>METADADOS EXTRAÍDOS COM SUCESSO</span>
            </div>
            <button className="btn-download" onClick={downloadReport}>
              <FileSearch size={18} /> EXPORTAR TXT
            </button>
          </div>
          
          <div className="metadata-grid">
            {Object.entries(exifData).map(([key, value]) => (
              <div key={key} className="metadata-item">
                <div className="metadata-key">{key}</div>
                <div className="metadata-value">
                  {key === 'Localização (Google Maps)' ? (
                    <a href={value} target="_blank" rel="noopener noreferrer" className="gps-link">
                      <ExternalLink size={14} /> Ver no Google Maps
                    </a>
                  ) : (
                    value
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
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
