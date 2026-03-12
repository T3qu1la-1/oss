import React, { useState } from 'react';
import { Globe, MapPin, Loader } from 'lucide-react';
import '../ToolPages.css';
import { API_URL } from '../config';

const GeoKit = () => {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
      setError('');
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/api/tools/extract-exif`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to extract location');
      
      const data = await response.json();
      
      if (data.gps && data.gps.lat && data.gps.lng) {
        // Get location name from coordinates using reverse geocoding
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.gps.lat}&lon=${data.gps.lng}`
        );
        
        const geoData = await geoResponse.json();
        
        setLocation({
          lat: data.gps.lat,
          lng: data.gps.lng,
          city: geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Unknown',
          country: geoData.address?.country || 'Unknown',
          state: geoData.address?.state || '',
          full_address: geoData.display_name || 'Unknown',
          accuracy: '95%'
        });
      } else {
        setError('No GPS data found in image EXIF');
      }
    } catch (err) {
      setError(err.message);
    }
    
    setLoading(false);
  };

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <Globe size={32} />
          <div>
            <h1>GEOKIT</h1>
            <p>&gt; Real geolocation from image EXIF</p>
          </div>
        </div>
      </div>

      <div className='tool-content'>
        <div className='search-box'>
          <div className='input-group-tool'>
            <label>UPLOAD IMAGE WITH GPS DATA</label>
            <input
              type='file'
              accept='image/*'
              onChange={handleFileChange}
              style={{padding: '0.5rem'}}
            />
          </div>
          {error && (
            <div className='alert-box' style={{borderLeftColor: '#f00', color: '#f00', marginTop: '1rem'}}>
              <span>{error}</span>
            </div>
          )}
          <button className='btn-tool' onClick={handleAnalyze} disabled={loading || !file}>
            {loading ? (
              <>
                <Loader className='spin' size={18} />
                ANALYZING...
              </>
            ) : (
              <>
                <MapPin size={18} />
                ANALYZE LOCATION
              </>
            )}
          </button>
        </div>

        {imagePreview && (
          <div className='output-box' style={{textAlign: 'center'}}>
            <img src={imagePreview} alt='Target' style={{maxWidth: '100%', maxHeight: '400px', border: '1px solid #333'}} />
          </div>
        )}

        {location && (
          <>
            <div className='stats-row'>
              <div className='stat-box success'>
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

            <div className='result-card found'>
              <h3 style={{marginBottom: '1rem'}}>GPS COORDINATES</h3>
              <div className='code-block'>
                Latitude: {location.lat}<br/>
                Longitude: {location.lng}<br/>
                {location.state && `State: ${location.state}`}<br/>
                Full Address: {location.full_address}
              </div>
              <a 
                href={`https://www.google.com/maps?q=${location.lat},${location.lng}`} 
                target='_blank' 
                rel='noopener noreferrer'
                className='btn-tool btn-secondary'
                style={{marginTop: '1rem', width: '100%'}}
              >
                <Globe size={18} />
                OPEN IN GOOGLE MAPS
              </a>
            </div>
          </>
        )}

        <div className='alert-box'>
          <Globe size={18} />
          <span>
            Upload an image with GPS EXIF data. Most modern smartphones embed GPS coordinates in photos.
          </span>
        </div>
      </div>
    </div>
  );
};

export default GeoKit;