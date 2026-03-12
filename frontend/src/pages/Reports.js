import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Download, Eye, Filter, Calendar } from 'lucide-react';
import './Reports.css';

import { API_URL } from '../config';

const Reports = () => {
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('all');

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/api/scans`, { headers });
      const completedScans = response.data.filter(s => s.status === 'completed');
      setScans(completedScans);
    } catch (error) {
      console.error('Erro ao carregar scans:', error);
    }
  };

  const loadVulnerabilities = async (scanId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/api/scans/${scanId}/vulnerabilities`, { headers });
      setVulnerabilities(response.data);
    } catch (error) {
      console.error('Erro ao carregar vulnerabilidades:', error);
    }
  };

  const selectScan = (scan) => {
    setSelectedScan(scan);
    loadVulnerabilities(scan.id);
  };

  const generateReport = () => {
    if (!selectedScan || vulnerabilities.length === 0) return;

    let report = '═══════════════════════════════════════════\n';
    report += '       RELATÓRIO DE SEGURANÇA OLHOS DE DEUS\n';
    report += '═══════════════════════════════════════════\n\n';
    
    report += `📋 INFORMAÇÕES DO SCAN\n`;
    report += `${'─'.repeat(45)}\n`;
    report += `Nome: ${selectedScan.name}\n`;
    report += `Alvo: ${selectedScan.target}\n`;
    report += `Tipo: ${selectedScan.scanType}\n`;
    report += `Data: ${new Date(selectedScan.createdAt).toLocaleString('pt-BR')}\n`;
    report += `Status: ${selectedScan.status}\n\n`;

    const severityCounts = {
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length
    };

    report += `📊 RESUMO EXECUTIVO\n`;
    report += `${'─'.repeat(45)}\n`;
    report += `Total de Vulnerabilidades: ${vulnerabilities.length}\n`;
    report += `  🔴 Críticas: ${severityCounts.critical}\n`;
    report += `  🟠 Altas: ${severityCounts.high}\n`;
    report += `  🟡 Médias: ${severityCounts.medium}\n`;
    report += `  🔵 Baixas: ${severityCounts.low}\n\n`;

    report += `⚠️ VULNERABILIDADES DETALHADAS\n`;
    report += `${'═'.repeat(45)}\n\n`;

    vulnerabilities.forEach((vuln, idx) => {
      report += `${idx + 1}. ${vuln.title.toUpperCase()}\n`;
      report += `${'─'.repeat(45)}\n`;
      report += `Severidade: ${vuln.severity.toUpperCase()}\n`;
      report += `Categoria: ${vuln.category}\n`;
      report += `Endpoint: ${vuln.endpoint}\n`;
      report += `\nDescrição:\n${vuln.description}\n`;
      report += `\nPayload Utilizado:\n${vuln.payload}\n`;
      report += `\nEvidência:\n${vuln.evidence}\n`;
      report += `\nRecomendação:\n${vuln.recommendation}\n`;
      if (vuln.cve) {
        report += `\nReferência: ${vuln.cve}\n`;
      }
      report += `\n${'═'.repeat(45)}\n\n`;
    });

    report += `📝 RECOMENDAÇÕES GERAIS\n`;
    report += `${'─'.repeat(45)}\n`;
    report += `1. Priorize correção de vulnerabilidades críticas e altas\n`;
    report += `2. Implemente validação de entrada em todos os endpoints\n`;
    report += `3. Configure headers de segurança adequados\n`;
    report += `4. Realize testes regulares de segurança\n`;
    report += `5. Mantenha frameworks e dependências atualizados\n\n`;

    report += `${'═'.repeat(45)}\n`;
    report += `Relatório gerado por: OLHOS DE DEUS\n`;
    report += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
    report += `${'═'.repeat(45)}\n`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${selectedScan.name.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    a.click();
  };

  const filteredVulns = filterSeverity === 'all' 
    ? vulnerabilities 
    : vulnerabilities.filter(v => v.severity === filterSeverity);

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#ff0066',
      high: '#ff6b35',
      medium: '#ffcc00',
      low: '#0099ff'
    };
    return colors[severity] || '#888';
  };

  return (
    <div className="reports-page">
      <header className="page-header">
        <h1>
          <FileText size={32} />
          RELATÓRIOS DE SEGURANÇA
        </h1>
        <p>Gere relatórios detalhados dos scans de vulnerabilidades</p>
      </header>

      <div className="reports-layout">
        <aside className="scans-sidebar">
          <h3>📋 SCANS CONCLUÍDOS</h3>
          {scans.length === 0 ? (
            <p className="no-scans">Nenhum scan concluído ainda</p>
          ) : (
            <div className="scans-list-reports">
              {scans.map(scan => (
                <div
                  key={scan.id}
                  className={`scan-item-report ${selectedScan?.id === scan.id ? 'active' : ''}`}
                  onClick={() => selectScan(scan)}
                >
                  <h4>{scan.name}</h4>
                  <p>{scan.target}</p>
                  <div className="scan-date">
                    <Calendar size={14} />
                    {new Date(scan.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        <main className="report-content">
          {!selectedScan ? (
            <div className="no-selection">
              <FileText size={64} />
              <h3>Selecione um scan para gerar relatório</h3>
              <p>Escolha um scan concluído na lista ao lado</p>
            </div>
          ) : (
            <>
              <div className="report-header">
                <div className="report-info">
                  <h2>{selectedScan.name}</h2>
                  <p className="target-url">{selectedScan.target}</p>
                </div>
                <button className="btn-generate" onClick={generateReport}>
                  <Download size={20} />
                  GERAR RELATÓRIO
                </button>
              </div>

              <div className="report-stats">
                <div className="stat-box">
                  <span className="stat-number">{vulnerabilities.length}</span>
                  <span className="stat-label">Total</span>
                </div>
                {['critical', 'high', 'medium', 'low'].map(sev => {
                  const count = vulnerabilities.filter(v => v.severity === sev).length;
                  if (count === 0) return null;
                  return (
                    <div key={sev} className="stat-box" style={{borderColor: getSeverityColor(sev)}}>
                      <span className="stat-number" style={{color: getSeverityColor(sev)}}>{count}</span>
                      <span className="stat-label">{sev === 'critical' ? 'Críticas' : sev === 'high' ? 'Altas' : sev === 'medium' ? 'Médias' : 'Baixas'}</span>
                    </div>
                  );
                })}
              </div>

              <div className="filter-bar">
                <Filter size={18} />
                <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
                  <option value="all">Todas as Severidades</option>
                  <option value="critical">Apenas Críticas</option>
                  <option value="high">Apenas Altas</option>
                  <option value="medium">Apenas Médias</option>
                  <option value="low">Apenas Baixas</option>
                </select>
              </div>

              <div className="vulnerabilities-preview">
                {filteredVulns.length === 0 ? (
                  <p className="no-vulns">Nenhuma vulnerabilidade encontrada com este filtro</p>
                ) : (
                  filteredVulns.map((vuln, idx) => (
                    <div key={idx} className="vuln-preview-card" style={{borderLeftColor: getSeverityColor(vuln.severity)}}>
                      <div className="vuln-preview-header">
                        <h4>{vuln.title}</h4>
                        <span className="severity-badge-report" style={{background: getSeverityColor(vuln.severity)}}>
                          {vuln.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="vuln-description">{vuln.description}</p>
                      <div className="vuln-meta">
                        <span>📍 {vuln.category}</span>
                        <span>🔗 {vuln.endpoint}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Reports;
