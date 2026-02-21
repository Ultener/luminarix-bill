import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { GameServer, serversApi } from '../store';
import { useAuth } from '../App';
import { motion } from 'framer-motion';

export default function MyServers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [servers, setServers] = useState<GameServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    serversApi.list()
      .then(setServers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusLabel = (s: string) => {
    if (s === 'active') return { text: 'Активен', cls: 'status-active' };
    if (s === 'suspended') return { text: 'Заблокирован', cls: 'status-suspended' };
    return { text: 'Истёк', cls: 'status-expired' };
  };

  const activeCount = servers.filter(s => s.status === 'active').length;
  const suspendedCount = servers.filter(s => s.status === 'suspended').length;
  const expiredCount = servers.filter(s => s.status === 'expired').length;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--blue-3)' }} /></div>;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Приветственный блок без аватарки */}
      <motion.div
        variants={itemVariants}
        style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(99,102,241,0.08))',
          border: '1px solid var(--border-light)',
          borderRadius: 24,
          padding: '24px 32px',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: 'var(--text-white)' }}>
            Управление серверами
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-gray)' }}>
            Здесь вы можете просматривать и управлять своими серверами.
          </p>
        </div>
      </motion.div>

      {/* Блок статистики по статусам */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 28
        }}
      >
        <div className="dash-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(52,211,153,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#34d399' }}>
            <i className="fas fa-check-circle" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Активные</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{activeCount}</div>
          </div>
        </div>
        <div className="dash-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(251,191,36,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fbbf24' }}>
            <i className="fas fa-ban" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Заблокированные</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{suspendedCount}</div>
          </div>
        </div>
        <div className="dash-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(107,114,128,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#6b7280' }}>
            <i className="fas fa-hourglass-end" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Истекшие</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{expiredCount}</div>
          </div>
        </div>
      </motion.div>

      {/* Заголовок и кнопка */}
      <motion.div
        variants={itemVariants}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <h1 className="dash-title">Мои серверы</h1>
          <p className="dash-subtitle" style={{ marginBottom: 0 }}>Управляйте своими серверами</p>
        </div>
        <button className="btn btn-fill" onClick={() => navigate('/dashboard/purchase')}>
          <i className="fas fa-plus" /> Новый сервер
        </button>
      </motion.div>

      {/* Список серверов */}
      {servers.length === 0 ? (
        <motion.div variants={itemVariants} className="dash-card" style={{ textAlign: 'center', padding: '60px 28px' }}>
          <i className="fas fa-server" style={{ fontSize: 44, opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ marginBottom: 8 }}>У вас пока нет серверов</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>Создайте свой первый сервер</p>
          <button className="btn btn-fill" onClick={() => navigate('/dashboard/purchase')}>
            <i className="fas fa-rocket" /> Создать сервер
          </button>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="server-grid">
          {servers.map((server: GameServer) => {
            const st = statusLabel(server.status);
            const daysLeft = Math.max(0, Math.ceil((new Date(server.expiresAt).getTime() - Date.now()) / 86400000));
            return (
              <div key={server.id} className="server-card" onClick={() => navigate(`/dashboard/server/${server.id}`)}>
                <div className="server-card-head">
                  <h3>{server.name}</h3>
                  <div className={`status-badge ${st.cls}`}><span className="status-dot" />{st.text}</div>
                </div>
                <div className="server-info-row"><span className="lbl">Тариф</span><span className="val">{server.tariffTier} {server.tariffName}</span></div>
                <div className="server-info-row"><span className="lbl">Ядро</span><span className="val">{server.coreName}</span></div>
                {server.ip && <div className="server-info-row"><span className="lbl">IP</span><span className="val" style={{ fontFamily: 'monospace', fontSize: 12 }}>{server.ip}:{server.port}</span></div>}
                <div className="server-info-row"><span className="lbl">RAM</span><span className="val">{server.ram >= 1024 ? (server.ram / 1024).toFixed(0) + ' ГБ' : server.ram + ' МБ'}</span></div>
                <div className="server-info-row"><span className="lbl">Осталось</span><span className="val" style={{ color: daysLeft <= 7 ? '#ef4444' : '#34d399' }}>{daysLeft} дней</span></div>
                <div className="server-info-row"><span className="lbl">Цена</span><span className="val">{server.price}₽/мес</span></div>
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}