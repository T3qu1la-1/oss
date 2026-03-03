import React, { useState } from 'react';
import { Image, Upload, FileSearch, Download, Copy } from 'lucide-react';
import './ToolPages.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ExifHunter = () => {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
      setError('');
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/api/tools/extract-exif`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to extract EXIF');
      
      const data = await response.json();
      setMetadata(data);
    } catch (err) {
      setError(err.message);
    }
    
    setExtracting(false);
  };

  const copyMetadata = () => {
    const text = JSON.stringify(metadata, null, 2);
    navigator.clipboard.writeText(text);
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exif_data.json';
    a.click();
  };

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <Image size={32} />
          <div>
            <h1>EXIF HUNTER</h1>
            <p>&gt; Extract real image metadata & GPS</p>
          </div>
        </div>
      </div>

      <div className='tool-content'>
        <div className='input-group-tool'>
          <label>UPLOAD IMAGE FILE</label>
          <input
            type='file'
            accept='image/*'
            onChange={handleFileChange}
            style={{padding: '0.5rem'}}
          />
        </div>

        {error && (
          <div className='alert-box' style={{borderLeftColor: '#f00', color: '#f00'}}>
            <span>{error}</span>
          </div>
        )}

        <button className='btn-tool' onClick={handleExtract} disabled={extracting || !file}>
          {extracting ? 'EXTRACTING...' : (
            <>
              <FileSearch size={18} />
              EXTRACT METADATA
            </>
          )}
        </button>

        {imagePreview && (
          <div className='output-box' style={{textAlign: 'center', marginTop: '1rem'}}>
            <img src={imagePreview} alt='Target' style={{maxWidth: '100%', maxHeight: '300px', border: '1px solid #333'}} />
          </div>
        )}

        {metadata && (
          <>
            <div className='stats-row'>
              <button className='btn-tool btn-secondary' onClick={copyMetadata}>
                <Copy size={18} />
                COPY JSON
              </button>
              <button className='btn-tool btn-secondary' onClick={downloadJSON}>
                <Download size={18} />
                DOWNLOAD JSON
              </button>
            </div>

            <div className='grid-2'>
              <div className='result-card found'>
                <h3 style={{marginBottom: '1rem'}}>CAMERA INFO</h3>
                <div className='code-block'>
                  Device: {metadata.camera}<br/>
                  Date: {metadata.date}<br/>
                  Resolution: {metadata.resolution}<br/>
                  Size: {metadata.size}<br/>
                  Format: {metadata.format}
                </div>
              </div>

              <div className='result-card found'>
                <h3 style={{marginBottom: '1rem'}}>GPS LOCATION</h3>
                <div className='code-block'>
                  {metadata.gps.lat && metadata.gps.lng ? (
                    <>
                      Latitude: {metadata.gps.lat}<br/>
                      Longitude: {metadata.gps.lng}<br/>
                      <a href={`https://www.google.com/maps?q=${metadata.gps.lat},${metadata.gps.lng}`} target='_blank' rel='noopener noreferrer' style={{color: '#0f0'}}>View on Google Maps</a>
                    </>
                  ) : (
                    'No GPS data found'
                  )}
                </div>
              </div>

              <div className='result-card found'>
                <h3 style={{marginBottom: '1rem'}}>CAMERA SETTINGS</h3>
                <div className='code-block'>
                  ISO: {metadata.settings.iso}<br/>
                  Aperture: {metadata.settings.aperture}<br/>
                  Shutter: {metadata.settings.shutter}<br/>
                  Focal: {metadata.settings.focal}
                </div>
              </div>

              <div className='result-card found'>
                <h3 style={{marginBottom: '1rem'}}>SOFTWARE</h3>
                <div className='code-block'>
                  Editor: {metadata.software}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExifHunter;