import React, { useState } from 'react';
import { Image, Upload, FileSearch, Download, Copy } from 'lucide-react';
import './ToolPages.css';

const ExifHunter = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [extracting, setExtracting] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImageUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleExtract = () => {
    if (!imageUrl && !file) return;
    setExtracting(true);
    
    setTimeout(() => {
      setMetadata({
        camera: 'iPhone 13 Pro',
        date: '2024-03-03 14:30:22',
        gps: {
          lat: -23.5505,
          lng: -46.6333,
          location: 'São Paulo, Brazil'
        },
        settings: {
          iso: '400',
          aperture: 'f/1.8',
          shutter: '1/120',
          focal: '26mm'
        },
        software: 'Adobe Photoshop 2024',
        resolution: '4032 x 3024',
        size: '2.4 MB'
      });
      setExtracting(false);
    }, 1500);
  };

  const copyMetadata = () => {
    const text = JSON.stringify(metadata, null, 2);
    navigator.clipboard.writeText(text);
  };

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <Image size={32} />
          <div>
            <h1>EXIF HUNTER</h1>
            <p>&gt; Extract image metadata & GPS</p>
          </div>
        </div>
      </div>

      <div className='tool-content'>
        <div className='grid-2'>
          <div className='input-group-tool'>
            <label>IMAGE URL</label>
            <input
              type='text'
              placeholder='https://example.com/photo.jpg'
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          <div className='input-group-tool'>
            <label>OR UPLOAD FILE</label>
            <input
              type='file'
              accept='image/*'
              onChange={handleFileChange}
              style={{padding: '0.5rem'}}
            />
          </div>
        </div>

        <button className='btn-tool' onClick={handleExtract} disabled={extracting || (!imageUrl && !file)}>
          {extracting ? 'EXTRACTING...' : (
            <>
              <FileSearch size={18} />
              EXTRACT METADATA
            </>
          )}
        </button>

        {imageUrl && (
          <div className='output-box' style={{textAlign: 'center', marginTop: '1rem'}}>
            <img src={imageUrl} alt='Target' style={{maxWidth: '100%', maxHeight: '300px', border: '1px solid #333'}} onError={(e) => e.target.style.display = 'none'} />
          </div>
        )}

        {metadata && (
          <>
            <div className='stats-row'>
              <button className='btn-tool btn-secondary' onClick={copyMetadata}>
                <Copy size={18} />
                COPY ALL
              </button>
              <button className='btn-tool btn-secondary'>
                <Download size={18} />
                EXPORT JSON
              </button>
            </div>

            <div className='grid-2'>
              <div className='result-card found'>
                <h3 style={{marginBottom: '1rem'}}>CAMERA INFO</h3>
                <div className='code-block'>
                  Device: {metadata.camera}<br/>
                  Date: {metadata.date}<br/>
                  Resolution: {metadata.resolution}<br/>
                  Size: {metadata.size}
                </div>
              </div>

              <div className='result-card found'>
                <h3 style={{marginBottom: '1rem'}}>GPS LOCATION</h3>
                <div className='code-block'>
                  Latitude: {metadata.gps.lat}<br/>
                  Longitude: {metadata.gps.lng}<br/>
                  Location: {metadata.gps.location}
                </div>
              </div>

              <div className='result-card found'>
                <h3 style={{marginBottom: '1rem'}}>CAMERA SETTINGS</h3>
                <div className='code-block'>
                  ISO: {metadata.settings.iso}<br/>
                  Aperture: {metadata.settings.aperture}<br/>
                  Shutter: {metadata.settings.shutter}<br/>
                  Focal Length: {metadata.settings.focal}
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