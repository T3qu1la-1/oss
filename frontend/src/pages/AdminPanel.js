import React, { useState, useEffect } from 'react';
import { Crown, Users, Cpu, HardDrive, Database, Trash2, RefreshCw, Activity, Server, Shield, Eye, Globe, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import './ToolPages.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [telegramUsers, setTelegramUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [botStatus, setBotStatus] = useState(null);
  const [ddosAlerts, setDdosAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, statsRes, botRes, ddosRes] = await Promise.allSettled([
        axios.get(`${BACKEND_URL}/api/admin/users`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/stats`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/telegram/status`, { headers }),
        axios.get(`${BACKEND_URL}/api/admin/ddos/alerts`, { headers }),
      ]);

      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.data.regular_users || []);
        setTelegramUsers(usersRes.value.data.telegram_users || []);
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (botRes.status === 'fulfilled') setBotStatus(botRes.value.data);
      if (ddosRes.status === 'fulfilled') setDdosAlerts(ddosRes.value.data);

      setLoading(false);
    } catch (error) {
      console.error('Erro admin:', error);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Dados atualizados!');
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BACKEND_URL}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Usuário deletado');
      loadData();
    } catch (error) {
      toast.error('Erro ao deletar');
    }
  };

  const StatCard = ({ icon, label, value, sub, color, percent }) => (
    <div className='output-box' style={{ background: `${color}08`, borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {icon}
          <strong style={{ color }}>{label}</strong>
        </div>
        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>{value}</span>
      </div>
      {percent !== undefined && (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
          <div style={{ width: `${percent}%`, height: '100%', background: percent > 80 ? '#ff4444' : color, transition: 'width 0.5s' }} />
        </div>
      )}
      {sub && <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.5rem' }}>{sub}</p>}
    </div>
  );

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
            <h1>PAINEL DE ADMINISTRADOR</h1>
            <p>&gt; Tempo real - Auto-refresh a cada 15s</p>
          </div>
        </div>
        <button className='btn-tool btn-secondary' onClick={handleRefresh} disabled={refreshing} style={{ marginLeft: 'auto' }}>
          <RefreshCw className={refreshing ? 'spin' : ''} size={20} />
          Atualizar
        </button>
      </div>

      <div className='tool-content'>
        {/* SYSTEM STATS */}
        <h2 style={{ color: '#00ff41', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={24} /> Sistema
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard icon={<Cpu size={20} color='#00ff41' />} label="CPU" value={`${stats?.system?.cpu?.usage_percent || 0}%`} sub={`${stats?.system?.cpu?.cores || '?'} cores`} color="#00ff41" percent={stats?.system?.cpu?.usage_percent} />
          <StatCard icon={<Server size={20} color='#00bfff' />} label="RAM" value={`${stats?.system?.memory?.percent || 0}%`} sub={`${stats?.system?.memory?.used_gb || 0} / ${stats?.system?.memory?.total_gb || 0} GB`} color="#00bfff" percent={stats?.system?.memory?.percent} />
          <StatCard icon={<HardDrive size={20} color='#ffa500' />} label="Disco" value={`${stats?.system?.storage?.percent || 0}%`} sub={`${stats?.system?.storage?.used_gb || 0} / ${stats?.system?.storage?.total_gb || 0} GB`} color="#ffa500" percent={stats?.system?.storage?.percent} />
          <StatCard icon={<Eye size={20} color='#e879f9' />} label="Backend" value={`${stats?.backend_process?.memory_mb || 0} MB`} sub={`CPU: ${stats?.backend_process?.cpu_percent || 0}%`} color="#e879f9" />
          <StatCard icon={<Globe size={20} color='#34d399' />} label="Visitas" value={stats?.visits?.total || 0} color="#34d399" />
          <StatCard icon={<Database size={20} color='#9333ea' />} label="Projeto" value={`${stats?.project?.size_mb || 0} MB`} sub={`Engine: ${stats?.database?.engine || 'RocksDB'}`} color="#9333ea" />
        </div>

        {/* TELEGRAM BOT STATUS */}
        <h2 style={{ color: '#00bfff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={24} /> Telegram Bot
        </h2>
        <div className='output-box' style={{ marginBottom: '2rem', borderLeft: `4px solid ${botStatus?.online ? '#00ff41' : '#ff4444'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: botStatus?.online ? '#00ff41' : '#ff4444', boxShadow: `0 0 8px ${botStatus?.online ? '#00ff41' : '#ff4444'}` }} />
            <strong style={{ color: botStatus?.online ? '#00ff41' : '#ff4444' }}>
              {botStatus?.online ? 'ONLINE' : 'OFFLINE'}
            </strong>
            <span style={{ color: '#888' }}>@{botStatus?.bot_username || 'N/A'}</span>
            <span style={{ color: '#888' }}>| {botStatus?.registered_users || 0} users registrados</span>
          </div>
        </div>

        {/* DDOS ALERTS */}
        <h2 style={{ color: '#ff4444', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={24} /> Alarmes DDoS/DoS
        </h2>
        <div className='output-box' style={{ marginBottom: '2rem', borderLeft: '4px solid #ff4444' }}>
          {ddosAlerts?.active_alerts > 0 ? (
            <div>
              <p style={{ color: '#ff4444', marginBottom: '0.5rem' }}>
                <AlertTriangle size={16} style={{ verticalAlign: 'middle' }} /> {ddosAlerts.active_alerts} alerta(s)
              </p>
              {ddosAlerts.alerts?.map((a, i) => (
                <div key={i} style={{ padding: '0.5rem', borderBottom: '1px solid #222', fontSize: '0.85rem' }}>
                  <span style={{ color: a.severity === 'HIGH' ? '#ff0000' : '#ffa500' }}>[{a.severity}]</span>
                  {' '}<span style={{ color: '#ccc' }}>IP: {a.ip}</span>
                  {' '}<span style={{ color: '#888' }}>{a.requests_per_minute} req/min</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#34d399' }}>Nenhum ataque detectado | Threshold: {ddosAlerts?.threshold || '100 req/min per IP'}</p>
          )}
        </div>

        {/* USERS TABLE */}
        <h2 style={{ color: '#00ff41', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={24} /> Usuarios ({users.length + telegramUsers.length})
        </h2>
        <div className='output-box' style={{ marginBottom: '1rem' }}>
          <h3 style={{ color: '#00ff41', marginBottom: '0.75rem' }}>Regulares ({users.length})</h3>
          {users.length === 0 ? (
            <p style={{ color: '#888', textAlign: 'center', padding: '1rem' }}>Nenhum</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '2px solid #333' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: '#00ff41' }}>Email</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: '#00ff41' }}>Username</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', color: '#00ff41' }}>Acoes</th>
                </tr></thead>
                <tbody>{users.map((u, i) => (
                  <tr key={u.id || i} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '0.5rem', color: '#ccc' }}>{u.email}</td>
                    <td style={{ padding: '0.5rem', color: '#ccc' }}>{u.username}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <button className='btn-tool' onClick={() => handleDeleteUser(u.id)} style={{ background: '#ff0000', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                        <Trash2 size={14} /> Del
                      </button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
        <div className='output-box'>
          <h3 style={{ color: '#00bfff', marginBottom: '0.75rem' }}>Telegram ({telegramUsers.length})</h3>
          {telegramUsers.length === 0 ? (
            <p style={{ color: '#888', textAlign: 'center', padding: '1rem' }}>Nenhum</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '2px solid #333' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: '#00bfff' }}>ID</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: '#00bfff' }}>Nome</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', color: '#00bfff' }}>@User</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center', color: '#00bfff' }}>Acoes</th>
                </tr></thead>
                <tbody>{telegramUsers.map((u, i) => (
                  <tr key={u.id || i} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '0.5rem', color: '#00bfff', fontFamily: 'monospace' }}>{u.telegram_id}</td>
                    <td style={{ padding: '0.5rem', color: '#ccc' }}>{u.first_name}</td>
                    <td style={{ padding: '0.5rem', color: '#888' }}>@{u.telegram_username}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <button className='btn-tool' onClick={() => handleDeleteUser(u.id)} style={{ background: '#ff0000', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                        <Trash2 size={14} /> Del
                      </button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        table th, table td { white-space: nowrap; }
      `}</style>
    </div>
  );
};

export default AdminPanel;
