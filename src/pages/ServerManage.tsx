import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { GameServer, serversApi, pteroApi, Tariff, plansApi } from '../store';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PTERO_URL = 'https://console.luminarix.fun';

// Вспомогательная функция для форматирования цены (рубли, две копейки)
const formatPrice = (price: number) => {
  return price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
};

export default function ServerManage() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [server, setServer] = useState<GameServer | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [autoRenew, setAutoRenew] = useState(false);
  const [renewMonths, setRenewMonths] = useState(1);
  const [showConfirmChange, setShowConfirmChange] = useState<Tariff | null>(null);

  useEffect(() => {
    if (id) {
      serversApi.get(id)
        .then(data => {
          setServer(data);
          setAutoRenew(data.autoRenew || false);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    plansApi.list().then(setTariffs).catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
        <div style={{ height: 40, width: 200, background: 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 200, background: 'rgba(255,255,255,0.03)', borderRadius: 16 }} />)}
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="dash-card" style={{ textAlign: 'center', padding: 60 }}>
        <h3>Сервер не найден</h3>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard/servers')} style={{ marginTop: 20 }}>
          <i className="fas fa-arrow-left" /> Назад
        </button>
      </div>
    );
  }

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => { setMsg(text); setMsgType(type); };
  const expires = new Date(server.expiresAt);
  const daysLeft = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86400000));
  const isAdmin = user?.role === 'admin' || user?.isAdmin;

  const handleRenew = async (months: number) => {
    setActionLoading('renew');
    try {
      const result = await serversApi.renew(server.id, months);
      setServer(result.server);
      await refreshUser();
      showMsg(`Сервер продлён на ${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}`);
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить сервер безвозвратно?')) return;
    setActionLoading('delete');
    try {
      if (server.pterodactylServerId) await pteroApi.deleteServer(server.pterodactylServerId).catch(() => {});
      await serversApi.delete(server.id);
      navigate('/dashboard/servers');
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Ошибка', 'error');
      setActionLoading('');
    }
  };

  const handleAutoRenewToggle = async () => {
    const newState = !autoRenew;
    setActionLoading('autorenew');
    try {
      const updated = await serversApi.update(server.id, { autoRenew: newState });
      setServer(updated);
      setAutoRenew(newState);
      showMsg(`Автопродление ${newState ? 'включено' : 'отключено'}`);
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleChangeTariff = async (newTariff: Tariff) => {
    setActionLoading('changeTariff');
    setShowConfirmChange(null);
    try {
      const result = await serversApi.changeTariff(server.id, newTariff.id);
      setServer(result.server);
      await refreshUser();
      showMsg(`Тариф изменён на ${newTariff.tier} ${newTariff.name}`);
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ maxWidth: 1200, margin: '0 auto' }}
    >
      {/* Шапка */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
        <h1 className="dash-title" style={{ marginBottom: 0 }}>{server.name}</h1>
        <div className={`status-badge ${server.status === 'active' ? 'status-active' : server.status === 'suspended' ? 'status-suspended' : 'status-expired'}`}>
          <span className="status-dot" />
          {server.status === 'active' ? 'Активен' : server.status === 'suspended' ? 'Заблокирован' : 'Истёк'}
        </div>
        {server.tariffTier === 'Free' && (
          <span style={{ background: 'rgba(52,211,153,.1)', color: '#34d399', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            Free
          </span>
        )}
      </div>

      {/* Сообщения */}
      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '12px 16px', borderRadius: 12, marginBottom: 16,
              background: msgType === 'error' ? 'rgba(239,68,68,.1)' : 'rgba(52,211,153,.1)',
              border: `1px solid ${msgType === 'error' ? 'rgba(239,68,68,.2)' : 'rgba(52,211,153,.2)'}`,
              color: msgType === 'error' ? '#f87171' : '#34d399',
              fontSize: 13, fontWeight: 600,
              display: 'flex', justifyContent: 'space-between',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span><i className={`fas ${msgType === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`} style={{ marginRight: 8 }} />{msg}</span>
            <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><i className="fas fa-times" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Блок с информацией в три колонки */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
        {/* Ресурсы */}
        <motion.div
          className="dash-card"
          style={{ padding: '24px' }}
          whileHover={{ y: -4, boxShadow: '0 12px 24px -8px rgba(0,0,0,0.3)' }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-chart-bar" style={{ color: 'var(--blue-3)' }} />
            Ресурсы
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-microchip" style={{ width: 16 }} /> CPU
              </span>
              <span style={{ fontWeight: 600 }}>{server.cores} {server.cores === 1 ? 'ядро' : server.cores < 5 ? 'ядра' : 'ядер'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-memory" style={{ width: 16 }} /> RAM
              </span>
              <span style={{ fontWeight: 600 }}>{(server.ram / 1024).toFixed(1)} ГБ ({server.ram} МБ)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-hdd" style={{ width: 16 }} /> Диск
              </span>
              <span style={{ fontWeight: 600 }}>{(server.disk / 1024).toFixed(1)} ГБ ({server.disk} МБ)</span>
            </div>
          </div>
        </motion.div>

        {/* Подписка */}
        <motion.div
          className="dash-card"
          style={{ padding: '24px' }}
          whileHover={{ y: -4, boxShadow: '0 12px 24px -8px rgba(0,0,0,0.3)' }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-calendar-alt" style={{ color: 'var(--blue-3)' }} />
            Подписка
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Истекает</span>
              <span style={{ fontWeight: 600 }}>{expires.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dim)' }}>Автопродление</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 600 }}>{autoRenew ? 'Вкл' : 'Выкл'}</span>
                <button
                  className={`btn ${autoRenew ? 'btn-fill' : 'btn-ghost'}`}
                  onClick={handleAutoRenewToggle}
                  disabled={actionLoading === 'autorenew'}
                  style={{ padding: '4px 12px', fontSize: 12 }}
                >
                  {actionLoading === 'autorenew' ? <i className="fas fa-spinner fa-spin" /> : (autoRenew ? 'Выключить' : 'Включить')}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Стоимость</span>
              <span style={{ fontWeight: 600 }}>{formatPrice(server.price)} /мес</span>
            </div>
          </div>
        </motion.div>

        {/* Информация */}
        <motion.div
          className="dash-card"
          style={{ padding: '24px' }}
          whileHover={{ y: -4, boxShadow: '0 12px 24px -8px rgba(0,0,0,0.3)' }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-info-circle" style={{ color: 'var(--blue-3)' }} />
            Информация
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Тариф</span>
              <span style={{ fontWeight: 600 }}>{server.tariffTier} {server.tariffName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Создан</span>
              <span style={{ fontWeight: 600 }}>{new Date(server.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            {server.pterodactylIdentifier && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Панель</span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4 }}>
                    {server.pterodactylIdentifier.substring(0, 8)}
                  </span>
                </div>
                <div style={{ marginTop: 4 }}>
                  <a
                    href={`${PTERO_URL}/server/${server.pterodactylIdentifier}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '8px' }}
                  >
                    <i className="fas fa-external-link-alt" style={{ marginRight: 6 }} /> Открыть панель
                  </a>
                </div>
                {/* Красное напоминание об отправке данных на почту */}
                <div style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8,
                  color: '#ef4444',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <i className="fas fa-envelope" />
                  <span>Данные для входа в панель отправлены на вашу почту при регистрации</span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Блок продления */}
      <motion.div
        className="dash-card"
        style={{ padding: '28px', marginBottom: 32 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Продление</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[1, 3, 6, 12].map(m => {
            const basePrice = server.price * m;
            const discount = m === 12 ? 0.2 : 0; // 20% скидка для 12 месяцев
            const finalPrice = discount ? basePrice * (1 - discount) : basePrice;
            return (
              <motion.button
                key={m}
                onClick={() => setRenewMonths(m)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '20px 8px',
                  borderRadius: 16,
                  border: `2px solid ${renewMonths === m ? 'var(--blue-1)' : 'var(--border-dim)'}`,
                  background: renewMonths === m ? 'rgba(37,99,235,.08)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                  boxShadow: renewMonths === m ? '0 8px 16px -4px rgba(37,99,235,0.3)' : 'none',
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{m} мес.</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue-3)' }}>{formatPrice(finalPrice)}</div>
                {discount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 12,
                    padding: '4px 8px',
                    borderRadius: 20,
                    fontWeight: 700,
                  }}>
                    -{discount * 100}%
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ color: 'var(--text-dim)', marginRight: 8 }}>Итого</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--blue-3)' }}>
              {formatPrice(server.price * renewMonths)}
            </span>
            <span style={{ fontSize: 14, color: 'var(--text-dim)', marginLeft: 8 }}>за {renewMonths} мес.</span>
          </div>
          <motion.button
            className="btn btn-fill"
            onClick={() => handleRenew(renewMonths)}
            disabled={actionLoading === 'renew'}
            style={{ padding: '14px 40px', fontSize: 16 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {actionLoading === 'renew' ? <i className="fas fa-spinner fa-spin" /> : 'Продлить →'}
          </motion.button>
        </div>
      </motion.div>

      {/* Блок смены тарифа */}
      <motion.div
        className="dash-card"
        style={{ padding: '28px' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Сменить тариф</h3>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 24 }}>Более мощная конфигурация</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {tariffs.filter(t => t.id !== server.tariffId).map(t => (
            <motion.div
              key={t.id}
              onClick={() => setShowConfirmChange(t)}
              whileHover={{ y: -4, boxShadow: '0 12px 24px -8px rgba(0,0,0,0.3)' }}
              style={{
                padding: '20px',
                borderRadius: 16,
                border: '1px solid var(--border-dim)',
                background: 'var(--bg-card)',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue-1)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-dim)'}
            >
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{t.tier} {t.name}</div>
              <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-dim)' }}><i className="fas fa-microchip" style={{ width: 16, marginRight: 4 }} /> CPU</span>
                  <span>{t.cores} {t.cores === 1 ? 'ядро' : 'ядра'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-dim)' }}><i className="fas fa-memory" style={{ width: 16, marginRight: 4 }} /> RAM</span>
                  <span>{(t.ram / 1024).toFixed(1)} ГБ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-dim)' }}><i className="fas fa-hdd" style={{ width: 16, marginRight: 4 }} /> Диск</span>
                  <span>{(t.disk / 1024).toFixed(1)} ГБ</span>
                </div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue-3)' }}>{formatPrice(t.price)}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-dim)' }}>/мес</span></div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Модалка подтверждения смены тарифа */}
      <AnimatePresence>
        {showConfirmChange && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onClick={() => setShowConfirmChange(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ background: 'var(--bg-card)', borderRadius: 24, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Подтверждение</h3>
              <p style={{ marginBottom: 24, lineHeight: 1.6 }}>
                Вы уверены, что хотите сменить тариф на <strong>{showConfirmChange.tier} {showConfirmChange.name}</strong>?
                {server.pterodactylServerId && <><br />Ресурсы сервера в Pterodactyl будут обновлены.</>}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowConfirmChange(null)}>Отмена</button>
                <button
                  className="btn btn-fill"
                  onClick={() => handleChangeTariff(showConfirmChange)}
                  disabled={actionLoading === 'changeTariff'}
                >
                  {actionLoading === 'changeTariff' ? <i className="fas fa-spinner fa-spin" /> : 'Сменить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Кнопка удаления */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <motion.button
          className="btn btn-ghost"
          onClick={handleDelete}
          disabled={actionLoading === 'delete'}
          style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,.3)', padding: '12px 24px' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <i className={actionLoading === 'delete' ? 'fas fa-spinner fa-spin' : 'fas fa-trash'} /> Удалить сервер
        </motion.button>
      </div>
    </motion.div>
  );
}