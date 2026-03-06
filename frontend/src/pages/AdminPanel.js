import React, { useState, useEffect } from 'react';
import { Crown, Users, Cpu, HardDrive, Database, Trash2, RefreshCw, Activity, Server } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import './ToolPages.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [telegramUsers, setTelegramUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Buscar usuários
      const usersResponse = await axios.get(`${BACKEND_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUsers(usersResponse.data.users || []);
      setTelegramUsers(usersResponse.data.telegram_users || []);
      
      // Buscar estatísticas
      const statsResponse = await axios.get(`${BACKEND_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStats(statsResponse.data);
      setLoading(false);
      
    } catch (error) {
      console.error('Erro ao carregar dados admin:', error);
      toast.error('Erro ao carregar dados do painel admin');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Dados atualizados!');
  };

  const handleDeleteUser = async (userId, isTeleg) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BACKEND_URL}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Usuário deletado com sucesso');
      loadData();
    } catch (error) {
      toast.error('Erro ao deletar usuário');
    }
  };

  if (loading) {
    return (
      <div className='tool-page'>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <RefreshCw className='spin' size={48} color='#00ff41' />
          <p style={{ color: '#00ff41', marginTop: '1rem' }}>Carregando painel admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='tool-page'>
      <div className='tool-header'>
        <div className='tool-title'>
          <Crown size={32} color='#ffd700' />
          <div>
            <h1>👑 PAINEL DE ADMINISTRADOR</h1>
            <p>&gt; Bem-vindo, {user?.username || 'Admin Master'}</p>
          </div>
        </div>
        <button 
          className='btn-tool btn-secondary'
          onClick={handleRefresh}
          disabled={refreshing}
          style={{ marginLeft: 'auto' }}
        >
          <RefreshCw className={refreshing ? 'spin' : ''} size={20} />
          Atualizar
        </button>
      </div>

      <div className='tool-content'>
        {/* ESTATÍSTICAS DO SISTEMA */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#00ff41', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={24} />
            Estatísticas do Sistema
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {/* CPU */}
            <div className='output-box' style={{ background: 'rgba(0, 255, 65, 0.05)', borderLeft: '4px solid #00ff41' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cpu size={20} color='#00ff41' />
                  <strong style={{ color: '#00ff41' }}>CPU</strong>
                </div>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00ff41' }}>
                  {stats?.system.cpu.usage_percent}%
                </span>
              </div>
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats?.system.cpu.usage_percent}%`, 
                  height: '100%', 
                  background: stats?.system.cpu.usage_percent > 80 ? '#ff0000' : '#00ff41',
                  transition: 'width 0.3s'
                }} />
              </div>
              <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {stats?.system.cpu.cores} cores
              </p>
            </div>

            {/* RAM */}
            <div className='output-box' style={{ background: 'rgba(0, 191, 255, 0.05)', borderLeft: '4px solid #00bfff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Server size={20} color='#00bfff' />
                  <strong style={{ color: '#00bfff' }}>RAM</strong>
                </div>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00bfff' }}>
                  {stats?.system.memory.percent}%
                </span>
              </div>
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats?.system.memory.percent}%`, 
                  height: '100%', 
                  background: stats?.system.memory.percent > 80 ? '#ff0000' : '#00bfff',
                  transition: 'width 0.3s'
                }} />
              </div>
              <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {stats?.system.memory.used_gb} GB / {stats?.system.memory.total_gb} GB
              </p>
            </div>

            {/* STORAGE */}
            <div className='output-box' style={{ background: 'rgba(255, 165, 0, 0.05)', borderLeft: '4px solid #ffa500' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HardDrive size={20} color='#ffa500' />
                  <strong style={{ color: '#ffa500' }}>Storage</strong>
                </div>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffa500' }}>
                  {stats?.system.storage.percent}%
                </span>
              </div>
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats?.system.storage.percent}%`, 
                  height: '100%', 
                  background: stats?.system.storage.percent > 80 ? '#ff0000' : '#ffa500',
                  transition: 'width 0.3s'
                }} />
              </div>
              <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                {stats?.system.storage.used_gb} GB / {stats?.system.storage.total_gb} GB
              </p>
            </div>

            {/* DATABASE */}
            <div className='output-box' style={{ background: 'rgba(147, 51, 234, 0.05)', borderLeft: '4px solid #9333ea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Database size={20} color='#9333ea' />
                  <strong style={{ color: '#9333ea' }}>Database</strong>
                </div>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
                <p>👥 Users: {stats?.database.users}</p>
                <p>📱 Telegram: {stats?.database.telegram_users}</p>
                <p>🔍 Scans: {stats?.database.scans}</p>
                <p>⚠️ Vulns: {stats?.database.vulnerabilities}</p>
              </div>
            </div>
          </div>
        </div>

        {/* USUÁRIOS REGULARES */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#00ff41', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={24} />
            Usuários Regulares ({users.length})
          </h2>
          
          <div className='output-box'>
            {users.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
                Nenhum usuário cadastrado
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #333' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', color: '#00ff41' }}>Email</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', color: '#00ff41' }}>Username</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', color: '#00ff41' }}>Criado em</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', color: '#00ff41' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => (
                      <tr key={u.id || idx} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '0.75rem', color: '#ccc' }}>{u.email}</td>
                        <td style={{ padding: '0.75rem', color: '#ccc' }}>{u.username}</td>
                        <td style={{ padding: '0.75rem', color: '#888', fontSize: '0.85rem' }}>
                          {new Date(u.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            className='btn-tool'
                            onClick={() => handleDeleteUser(u.id, false)}
                            style={{ 
                              background: '#ff0000', 
                              padding: '0.5rem 1rem', 
                              fontSize: '0.85rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <Trash2 size={16} />
                            Deletar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* USUÁRIOS TELEGRAM */}
        <div>
          <h2 style={{ color: '#00bfff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📱 Usuários Telegram ({telegramUsers.length})
          </h2>
          
          <div className='output-box'>
            {telegramUsers.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
                Nenhum usuário do Telegram cadastrado
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #333' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', color: '#00bfff' }}>Telegram ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', color: '#00bfff' }}>Nome</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', color: '#00bfff' }}>Username</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', color: '#00bfff' }}>IPs</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', color: '#00bfff' }}>Criado em</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', color: '#00bfff' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telegramUsers.map((u, idx) => (
                      <tr key={u.id || idx} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '0.75rem', color: '#00bfff', fontFamily: 'monospace' }}>
                          {u.telegram_id}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#ccc' }}>{u.first_name}</td>
                        <td style={{ padding: '0.75rem', color: '#888' }}>@{u.telegram_username}</td>
                        <td style={{ padding: '0.75rem', color: '#888', fontSize: '0.85rem' }}>
                          {u.ips?.length || 0} IP(s)
                        </td>
                        <td style={{ padding: '0.75rem', color: '#888', fontSize: '0.85rem' }}>
                          {new Date(u.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            className='btn-tool'
                            onClick={() => handleDeleteUser(u.id, true)}
                            style={{ 
                              background: '#ff0000', 
                              padding: '0.5rem 1rem', 
                              fontSize: '0.85rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <Trash2 size={16} />
                            Deletar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        table th, table td {
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

export default AdminPanel;
