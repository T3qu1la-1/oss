import React, { useState } from 'react';
import { Globe, Upload, MapPin } from 'lucide-react';
import '../ToolPages.css';

const GeoKit = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState(null);
  const [location, setLocation] = useState(null);

  const handleAnalyze = () => {
    setLocation({
      lat: -23.5505,
      lng: -46.6333,
      city: 'São Paulo',
      country: 'Brazil',
      accuracy: '85%'
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImageUrl(URL.createObjectURL(selectedFile));
    }
  };

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <Globe size={32} />
          <div>
            <h1>GEOKIT</h1>
            <p>&gt; Geolocation tools for OSINT</p>
          </div>
        </div>
      </div>

      <div className='tool-content'>
        <div className='search-box'>
          <div className='input-group-tool'>
            <label>IMAGE URL</label>
            <input
              type='text'
              placeholder='https://example.com/image.jpg'
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
          <button className='btn-tool' onClick={handleAnalyze}>
            <MapPin size={18} />
            ANALYZE LOCATION
          </button>
        </div>

        {imageUrl && (
          <div className='output-box' style={{textAlign: 'center'}}>
            <img src={imageUrl} alt='Target' style={{maxWidth: '100%', maxHeight: '400px', border: '1px solid #333'}} />
          </div>
        )}

        {location && (
          <div className='stats-row'>
            <div className='stat-box'>
              <div className='stat-value'>{location.city}</div>
              <div className='stat-label'>CITY</div>
            </div>
            <div className='stat-box'>
              <div className='stat-value'>{location.country}</div>
              <div className='stat-label'>COUNTRY</div>
            </div>
            <div className='stat-box'>
              <div className='stat-value'>{location.accuracy}</div>
              <div className='stat-label'>ACCURACY</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeoKit;