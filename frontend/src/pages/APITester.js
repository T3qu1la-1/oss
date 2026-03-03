import React, { useState } from 'react';
import { Code, Send, Copy, Download, Zap } from 'lucide-react';
import './ToolPages.css';

const APITester = () => {
  const [endpoint, setEndpoint] = useState('');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState(null);
  const [testing, setTesting] = useState(false);
  const [tests, setTests] = useState([]);

  const commonTests = [
    { name: 'SQL Injection', payload: "' OR '1'='1" },
    { name: 'XSS', payload: '<script>alert(1)</script>' },
    { name: 'Path Traversal', payload: '../../../etc/passwd' },
    { name: 'Command Injection', payload: '; ls -la' },
    { name: 'LDAP Injection', payload: '*)(uid=*)' },
    { name: 'XML External Entity', payload: '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>' }
  ];

  const handleTest = async () => {
    if (!endpoint) return;
    setTesting(true);
    
    try {
      const headersObj = headers ? JSON.parse(headers) : {};
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headersObj
        },
        body: method !== 'GET' ? body : undefined
      });
      
      const data = await res.text();
      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: data
      });
    } catch (error) {
      setResponse({
        error: error.message
      });
    }
    
    setTesting(false);
  };

  const runSecurityTests = async () => {
    setTesting(true);
    const results = [];
    
    for (const test of commonTests) {
      const testEndpoint = `${endpoint}${endpoint.includes('?') ? '&' : '?'}test=${encodeURIComponent(test.payload)}`;
      
      try {
        const res = await fetch(testEndpoint, { method: 'GET' });
        const data = await res.text();
        
        results.push({
          test: test.name,
          status: res.status,
          vulnerable: data.includes('error') || data.includes('Exception') || res.status === 500,
          response: data.substring(0, 200)
        });
      } catch (error) {
        results.push({
          test: test.name,
          status: 0,
          vulnerable: false,
          response: error.message
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setTests(results);
    setTesting(false);
  };

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <Code size={32} />
          <div>
            <h1>API SECURITY TESTER</h1>
            <p>&gt; Test REST/GraphQL endpoints for vulnerabilities</p>
          </div>
        </div>
      </div>

      <div className='tool-content'>
        <div className='grid-2'>
          <div className='input-group-tool'>
            <label>ENDPOINT URL</label>
            <input
              type='text'
              placeholder='https://api.example.com/users'
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
          </div>
          <div className='input-group-tool'>
            <label>METHOD</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value='GET'>GET</option>
              <option value='POST'>POST</option>
              <option value='PUT'>PUT</option>
              <option value='DELETE'>DELETE</option>
              <option value='PATCH'>PATCH</option>
            </select>
          </div>
        </div>

        <div className='input-group-tool'>
          <label>HEADERS (JSON)</label>
          <textarea
            placeholder='{"Authorization": "Bearer token"}'
            value={headers}
            onChange={(e) => setHeaders(e.target.value)}
          />
        </div>

        {method !== 'GET' && (
          <div className='input-group-tool'>
            <label>BODY (JSON)</label>
            <textarea
              placeholder='{"key": "value"}'
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        )}

        <div className='stats-row'>
          <button className='btn-tool' onClick={handleTest} disabled={testing || !endpoint}>
            <Send size={18} />
            SEND REQUEST
          </button>
          <button className='btn-tool btn-secondary' onClick={runSecurityTests} disabled={testing || !endpoint}>
            <Zap size={18} />
            RUN SECURITY TESTS
          </button>
        </div>

        {response && (
          <div className='output-box'>
            <h3>RESPONSE:</h3>
            <pre>
              {response.error || `
Status: ${response.status} ${response.statusText}
Headers: ${JSON.stringify(response.headers, null, 2)}

Body:
${response.body}
              `}
            </pre>
          </div>
        )}

        {tests.length > 0 && (
          <div className='results-grid'>
            <h3 style={{gridColumn: '1 / -1'}}>SECURITY TEST RESULTS:</h3>
            {tests.map((test, index) => (
              <div key={index} className={`result-card ${test.vulnerable ? 'found' : 'not-found'}`}>
                <div className='result-header'>
                  <span className='result-name'>{test.test}</span>
                  <span className='result-category'>STATUS: {test.status}</span>
                </div>
                <div className='code-block'>
                  {test.vulnerable ? '⚠️ POTENTIALLY VULNERABLE' : '✓ PASSED'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default APITester;
