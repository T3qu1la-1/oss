import React, { useState } from 'react';
import { TrendingUp, Upload, Download } from 'lucide-react';
import './ToolPages.css';

const DataVisualizer = () => {
  const [data, setData] = useState('');
  const [vizType, setVizType] = useState('network');

  const sampleData = {
    network: `{
  "nodes": [
    {"id": "user1", "label": "John Doe", "type": "person"},
    {"id": "user2", "label": "Jane Smith", "type": "person"},
    {"id": "ip1", "label": "192.168.1.1", "type": "ip"},
    {"id": "domain1", "label": "example.com", "type": "domain"}
  ],
  "edges": [
    {"from": "user1", "to": "ip1", "label": "connected"},
    {"from": "user2", "to": "ip1", "label": "connected"},
    {"from": "ip1", "to": "domain1", "label": "resolved"}
  ]
}`,
    heatmap: `{
  "locations": [
    {"lat": -23.5505, "lng": -46.6333, "weight": 10},
    {"lat": -22.9068, "lng": -43.1729, "weight": 8},
    {"lat": -19.9167, "lng": -43.9345, "weight": 5}
  ]
}`
  };

  const loadSample = () => {
    setData(sampleData[vizType]);
  };

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <TrendingUp size={32} />
          <div>
            <h1>DATA VISUALIZER</h1>
            <p>&gt; Visualize networks, relationships and data</p>
          </div>
        </div>
      </div>

      <div className='tool-content'>
        <div className='tabs'>
          <button className={`tab ${vizType === 'network' ? 'active' : ''}`} onClick={() => setVizType('network')}>
            NETWORK GRAPH
          </button>
          <button className={`tab ${vizType === 'heatmap' ? 'active' : ''}`} onClick={() => setVizType('heatmap')}>
            HEATMAP
          </button>
        </div>

        <div className='input-group-tool'>
          <label>DATA (JSON FORMAT)</label>
          <textarea
            value={data}
            onChange={(e) => setData(e.target.value)}
            placeholder='Enter JSON data...'
            style={{minHeight: '300px'}}
          />
        </div>

        <div className='stats-row'>
          <button className='btn-tool btn-secondary' onClick={loadSample}>
            LOAD SAMPLE
          </button>
          <button className='btn-tool'>
            <TrendingUp size={18} />
            VISUALIZE
          </button>
        </div>

        <div className='alert-box'>
          <TrendingUp size={18} />
          <span>
            Network visualization supports nodes (users, IPs, domains) and edges (connections). 
            Heatmap requires lat/lng coordinates and weight values.
          </span>
        </div>

        <div className='output-box'>
          <pre>[VISUALIZATION CANVAS - Integration with D3.js/Chart.js pending]</pre>
        </div>
      </div>
    </div>
  );
};

export default DataVisualizer;