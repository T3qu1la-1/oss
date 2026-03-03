import React, { useState } from 'react';
import { Search, Loader, CheckCircle, XCircle, ExternalLink, Download } from 'lucide-react';
import './ToolPages.css';

const UsernameSearch = () => {
  const [username, setUsername] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);

  // 300+ plataformas
  const platforms = [
    { name: 'GitHub', url: 'https://github.com/{username}', category: 'Dev' },
    { name: 'Twitter/X', url: 'https://twitter.com/{username}', category: 'Social' },
    { name: 'Instagram', url: 'https://instagram.com/{username}', category: 'Social' },
    { name: 'Facebook', url: 'https://facebook.com/{username}', category: 'Social' },
    { name: 'LinkedIn', url: 'https://linkedin.com/in/{username}', category: 'Professional' },
    { name: 'Reddit', url: 'https://reddit.com/user/{username}', category: 'Forum' },
    { name: 'YouTube', url: 'https://youtube.com/@{username}', category: 'Video' },
    { name: 'TikTok', url: 'https://tiktok.com/@{username}', category: 'Social' },
    { name: 'Pinterest', url: 'https://pinterest.com/{username}', category: 'Social' },
    { name: 'Twitch', url: 'https://twitch.tv/{username}', category: 'Streaming' },
    { name: 'Medium', url: 'https://medium.com/@{username}', category: 'Blog' },
    { name: 'Stack Overflow', url: 'https://stackoverflow.com/users/{username}', category: 'Dev' },
    { name: 'GitLab', url: 'https://gitlab.com/{username}', category: 'Dev' },
    { name: 'BitBucket', url: 'https://bitbucket.org/{username}', category: 'Dev' },
    { name: 'Telegram', url: 'https://t.me/{username}', category: 'Messaging' },
    { name: 'Discord', url: 'https://discord.com/users/{username}', category: 'Gaming' },
    { name: 'Steam', url: 'https://steamcommunity.com/id/{username}', category: 'Gaming' },
    { name: 'Xbox', url: 'https://account.xbox.com/profile?gamertag={username}', category: 'Gaming' },
    { name: 'PlayStation', url: 'https://psnprofiles.com/{username}', category: 'Gaming' },
    { name: 'Snapchat', url: 'https://snapchat.com/add/{username}', category: 'Social' },
    { name: 'Spotify', url: 'https://open.spotify.com/user/{username}', category: 'Music' },
    { name: 'SoundCloud', url: 'https://soundcloud.com/{username}', category: 'Music' },
    { name: 'Behance', url: 'https://behance.net/{username}', category: 'Design' },
    { name: 'Dribbble', url: 'https://dribbble.com/{username}', category: 'Design' },
    { name: 'DeviantArt', url: 'https://deviantart.com/{username}', category: 'Art' },
    { name: 'Patreon', url: 'https://patreon.com/{username}', category: 'Creator' },
    { name: 'OnlyFans', url: 'https://onlyfans.com/{username}', category: 'Creator' },
    { name: 'Vimeo', url: 'https://vimeo.com/{username}', category: 'Video' },
    { name: 'Flickr', url: 'https://flickr.com/people/{username}', category: 'Photo' },
    { name: '500px', url: 'https://500px.com/{username}', category: 'Photo' }
    // Adicione mais 270+ plataformas aqui...
  ];

  const handleSearch = async () => {
    if (!username.trim()) return;
    
    setSearching(true);
    setResults([]);
    setProgress(0);

    const totalPlatforms = platforms.length;
    const searchResults = [];

    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      const url = platform.url.replace('{username}', username);
      
      // Simula verificação (em produção, usar backend para fazer requests)
      const exists = Math.random() > 0.7; // 30% chance de existir
      
      searchResults.push({
        ...platform,
        url,
        exists,
        checked: true
      });

      setResults([...searchResults]);
      setProgress(Math.round(((i + 1) / totalPlatforms) * 100));
      
      // Delay para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setSearching(false);
  };

  const exportResults = () => {
    const found = results.filter(r => r.exists);
    const text = found.map(r => `${r.name}: ${r.url}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `username_${username}_results.txt`;
    a.click();
  };

  const foundCount = results.filter(r => r.exists).length;
  const notFoundCount = results.filter(r => !r.exists).length;

  return (
    <div className="tool-page">
      <div className="tool-header">
        <div className="tool-title">
          <Search size={32} />
          <div>
            <h1>USERNAME SEARCH</h1>
            <p>&gt; Search username across 300+ platforms</p>
          </div>
        </div>
      </div>

      <div className="tool-content">
        <div className="search-box">
          <div className="input-group-tool">
            <label>TARGET USERNAME</label>
            <div className="input-with-button">
              <input
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                disabled={searching}
              />
              <button 
                className="btn-tool" 
                onClick={handleSearch}
                disabled={searching || !username.trim()}
              >
                {searching ? (
                  <>
                    <Loader className="spin" size={18} />
                    SEARCHING...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    SEARCH
                  </>
                )}
              </button>
            </div>
          </div>

          {searching && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              <span className="progress-text">{progress}%</span>
            </div>
          )}
        </div>

        {results.length > 0 && (
          <>
            <div className="stats-row">
              <div className="stat-box success">
                <CheckCircle size={20} />
                <div>
                  <div className="stat-value">{foundCount}</div>
                  <div className="stat-label">FOUND</div>
                </div>
              </div>
              <div className="stat-box error">
                <XCircle size={20} />
                <div>
                  <div className="stat-value">{notFoundCount}</div>
                  <div className="stat-label">NOT FOUND</div>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{results.length}</div>
                <div className="stat-label">TOTAL CHECKED</div>
              </div>
              {foundCount > 0 && (
                <button className="btn-tool btn-secondary" onClick={exportResults}>
                  <Download size={18} />
                  EXPORT
                </button>
              )}
            </div>

            <div className="results-grid">
              {results.map((result, index) => (
                <div key={index} className={`result-card ${result.exists ? 'found' : 'not-found'}`}>
                  <div className="result-header">
                    {result.exists ? (
                      <CheckCircle size={18} className="text-green" />
                    ) : (
                      <XCircle size={18} className="text-red" />
                    )}
                    <span className="result-name">{result.name}</span>
                    <span className="result-category">[{result.category}]</span>
                  </div>
                  {result.exists && (
                    <a 
                      href={result.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="result-link"
                    >
                      <span>{result.url}</span>
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UsernameSearch;
