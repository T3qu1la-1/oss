import React, { useState } from 'react';
import { Target, Upload, Search, ExternalLink } from 'lucide-react';
import './ToolPages.css';

const ReverseImageSearch = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [results, setResults] = useState([]);

  const engines = [
    { name: 'Google Images', url: 'https://images.google.com/searchbyimage?image_url=', icon: '🔍' },
    { name: 'Yandex Images', url: 'https://yandex.com/images/search?rpt=imageview&url=', icon: '🔍' },
    { name: 'Bing Images', url: 'https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIIRP&sbisrc=UrlPaste&q=imgurl:', icon: '🔍' },
    { name: 'TinEye', url: 'https://tineye.com/search?url=', icon: '🔍' },
    { name: 'Baidu Images', url: 'https://image.baidu.com/n/pc_search?queryImageUrl=', icon: '🔍' },
    { name: 'SauceNAO', url: 'https://saucenao.com/search.php?url=', icon: '🔍' }
  ];

  const handleSearch = () => {
    if (!imageUrl) return;
    const searchResults = engines.map(engine => ({
      ...engine,
      searchUrl: engine.url + encodeURIComponent(imageUrl)
    }));
    setResults(searchResults);
  };

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <Target size={32} />
          <div>
            <h1>REVERSE IMAGE SEARCH PRO</h1>
            <p>&gt; Search images across multiple engines</p>
          </div>
        </div>
      </div>

      <div className='tool-content'>
        <div className='search-box'>
          <div className='input-group-tool'>
            <label>IMAGE URL</label>
            <div className='input-with-button'>
              <input
                type='text'
                placeholder='https://example.com/image.jpg'
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <button className='btn-tool' onClick={handleSearch} disabled={!imageUrl}>
                <Search size={18} />
                SEARCH
              </button>
            </div>
          </div>
        </div>

        {imageUrl && (
          <div className='output-box' style={{textAlign: 'center'}}>
            <img src={imageUrl} alt='Target' style={{maxWidth: '100%', maxHeight: '300px', border: '1px solid #333'}} onError={(e) => e.target.style.display = 'none'} />
          </div>
        )}

        {results.length > 0 && (
          <div className='results-grid'>
            {results.map((result, index) => (
              <div key={index} className='result-card found'>
                <div className='result-header'>
                  <span style={{fontSize: '2rem'}}>{result.icon}</span>
                  <span className='result-name'>{result.name}</span>
                </div>
                <a href={result.searchUrl} target='_blank' rel='noopener noreferrer' className='result-link'>
                  <span>Search on {result.name}</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReverseImageSearch;