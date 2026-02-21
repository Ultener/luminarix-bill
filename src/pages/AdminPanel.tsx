import { useState, useEffect, useCallback } from 'react';
import { GameServer, User, Ticket, Tariff, serversApi, adminApi, ticketsApi, plansApi, pteroApi, reviewsApi, Review } from '../store';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'servers' | 'users' | 'tickets' | 'plans' | 'ptero' | 'reviews';

const Badge = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: color + '20',
    color: color,
  }}>
    {children}
  </span>
);

const ActionButton = ({ onClick, disabled, loading, icon, children, variant = 'default' }: any) => {
  const variantStyles = {
    default: { background: 'var(--bg-card)', borderColor: 'var(--border-dim)', color: 'var(--text-gray)' },
    success: { background: 'rgba(52,211,153,.1)', borderColor: 'rgba(52,211,153,.2)', color: '#34d399' },
    warn: { background: 'rgba(251,191,36,.1)', borderColor: 'rgba(251,191,36,.2)', color: '#fbbf24' },
    danger: { background: 'rgba(239,68,68,.1)', borderColor: 'rgba(239,68,68,.2)', color: '#ef4444' },
  };
  const style = variantStyles[variant] || variantStyles.default;
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: '8px 14px',
        borderRadius: 10,
        border: '1px solid',
        ...style,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: '.2s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.opacity = '1')}
    >
      {loading ? <i className="fas fa-spinner fa-spin" /> : icon && <i className={`fas ${icon}`} />}
      {children}
    </button>
  );
};

export default function AdminPanel() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>('servers');
  const [servers, setServers] = useState<GameServer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [plans, setPlans] = useState<Tariff[]>([]);
  const [reviews, setReviews] = useState<(Review & { email: string })[]>([]);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [euUsername, setEuUsername] = useState('');
  const [euEmail, setEuEmail] = useState('');
  const [euPassword, setEuPassword] = useState('');
  const [euBalance, setEuBalance] = useState('');
  const [euRole, setEuRole] = useState<'user' | 'admin' | 'support'>('user');
  const [euBlocked, setEuBlocked] = useState(false);
  const [extendServer, setExtendServer] = useState<GameServer | null>(null);
  const [extendMonths, setExtendMonths] = useState(1);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [ticketReply, setTicketReply] = useState('');
  const [editPlan, setEditPlan] = useState<Tariff | null>(null);
  const [newPlan, setNewPlan] = useState(false);
  const [pName, setPName] = useState(''); const [pTier, setPTier] = useState(''); const [pPrice, setPPrice] = useState(''); const [pRam, setPRam] = useState(''); const [pCores, setPCores] = useState(''); const [pDisk, setPDisk] = useState(''); const [pFeatures, setPFeatures] = useState(''); const [pIcon, setPIcon] = useState('fa-cube'); const [pDesc, setPDesc] = useState(''); const [pPopular, setPPopular] = useState(false);
  const [pteroData, setPteroData] = useState<{ servers: unknown[]; users: unknown[] } | null>(null);
  const [pteroLoading, setPteroLoading] = useState(false);
  const [pteroError, setPteroError] = useState('');
  const [pteroConnected, setPteroConnected] = useState<boolean | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const [editServer, setEditServer] = useState<GameServer | null>(null);
  const [esName, setEsName] = useState('');
  const [esTariffId, setEsTariffId] = useState('');
  const [esRam, setEsRam] = useState('');
  const [esCores, setEsCores] = useState('');
  const [esDisk, setEsDisk] = useState('');
  const [esPrice, setEsPrice] = useState('');
  const [esExtendDays, setEsExtendDays] = useState('');

  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => { setMsg(text); setMsgType(type); };
  
  const reload = useCallback(() => {
    serversApi.list().then(setServers).catch(() => {});
    adminApi.users().then(setUsers).catch(() => {});
    ticketsApi.list().then(setTickets).catch(() => {});
    plansApi.list().then(setPlans).catch(() => {});
    reviewsApi.adminList().then(setReviews).catch(() => {});
  }, []);
  
  useEffect(() => { reload(); }, [reload]);

  const loadPtero = useCallback(async () => {
    setPteroLoading(true); setPteroError('');
    try {
      const [s, u] = await Promise.all([pteroApi.servers(), pteroApi.users()]);
      setPteroData({ servers: (s as { data?: unknown[] }).data || [], users: (u as { data?: unknown[] }).data || [] });
      setPteroConnected(true);
    } catch (e) { setPteroError(e instanceof Error ? e.message : 'Ошибка'); setPteroConnected(false); }
    finally { setPteroLoading(false); }
  }, []);
  useEffect(() => { if (tab === 'ptero') loadPtero(); }, [tab, loadPtero]);

  const testPtero = async () => { setTestLoading(true); try { const r = await pteroApi.test(); if (r.success) { showMsg(`Подключено! Серверов: ${r.total_servers}`); setPteroConnected(true); } else { showMsg(r.error || 'Ошибка', 'error'); setPteroConnected(false); } } catch (e) { showMsg(e instanceof Error ? e.message : 'Ошибка', 'error'); } finally { setTestLoading(false); } };

  // Server actions
  const toggleSuspend = async (s: GameServer) => { setActionLoading(s.id); try { if (s.pterodactylServerId) { if (s.status !== 'suspended') await pteroApi.suspend(s.pterodactylServerId); else await pteroApi.unsuspend(s.pterodactylServerId); } await adminApi.updateServer(s.id, { status: s.status === 'suspended' ? 'active' : 'suspended' }); reload(); showMsg(`"${s.name}" ${s.status === 'suspended' ? 'разблокирован' : 'заблокирован'}`); } catch (e) { showMsg(e instanceof Error ? e.message : '', 'error'); } finally { setActionLoading(''); } };
  const doExtend = async () => { if (!extendServer) return; try { const exp = new Date(Math.max(new Date(extendServer.expiresAt).getTime(), Date.now())); exp.setMonth(exp.getMonth() + extendMonths); await adminApi.updateServer(extendServer.id, { expiresAt: exp.toISOString(), status: 'active' }); reload(); showMsg(`"${extendServer.name}" продлён на ${extendMonths} мес.`); setExtendServer(null); } catch (e) { showMsg(e instanceof Error ? e.message : '', 'error'); } };
  const removeServer = async (s: GameServer) => { if (!confirm(`Удалить "${s.name}"?`)) return; setActionLoading(s.id); try { if (s.pterodactylServerId) await pteroApi.deleteServer(s.pterodactylServerId).catch(() => {}); await adminApi.deleteServer(s.id); reload(); showMsg(`"${s.name}" удалён`); } catch (e) { showMsg(e instanceof Error ? e.message : '', 'error'); } finally { setActionLoading(''); } };

  // User actions
  const openEditUser = (u: User) => { setEditUser(u); setEuUsername(u.username); setEuEmail(u.email); setEuPassword(''); setEuBalance(u.balance.toString()); setEuRole(u.role || 'user'); setEuBlocked(u.blocked); };
  const saveEditUser = async () => { if (!editUser) return; try { await adminApi.updateUser(editUser.id, { username: euUsername, email: euEmail, password: euPassword || undefined, balance: parseFloat(euBalance), role: euRole, blocked: euBlocked }); reload(); showMsg(`"${euUsername}" обновлён`); setEditUser(null); } catch (e) { showMsg(e instanceof Error ? e.message : '', 'error'); } };
  const removeUser = async (u: User) => { if (!confirm(`Удалить "${u.username}"?`)) return; try { await adminApi.deleteUser(u.id); reload(); showMsg(`Удалён: ${u.username}`); } catch (e) { showMsg(e instanceof Error ? e.message : '', 'error'); } };

  // Ticket actions
  const handleTicketReply = async () => { if (!activeTicket || !ticketReply.trim() || !currentUser) return; try { const updated = await ticketsApi.reply(activeTicket.id, ticketReply); setActiveTicket(updated); setTicketReply(''); reload(); } catch { /* */ } };
  const handleTicketClose = async (t: Ticket) => { try { await ticketsApi.close(t.id); reload(); if (activeTicket?.id === t.id) setActiveTicket(null); showMsg('Тикет закрыт'); } catch { /* */ } };

  const deleteTicket = async (ticketId: string) => {
    if (!confirm('Удалить этот тикет? Сообщения также будут удалены.')) return;
    setActionLoading(`ticket-${ticketId}`);
    try {
      await adminApi.deleteTicket(ticketId);
      reload();
      showMsg('Тикет удалён');
      if (activeTicket?.id === ticketId) setActiveTicket(null);
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setActionLoading('');
    }
  };

  const deleteAllTickets = async () => {
    if (!confirm('Вы уверены, что хотите удалить ВСЕ тикеты? Это действие необратимо.')) return;
    setActionLoading('delete-all');
    try {
      await adminApi.deleteAllTickets();
      reload();
      setActiveTicket(null);
      showMsg('Все тикеты удалены');
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setActionLoading('');
      setShowDeleteAllModal(false);
    }
  };

  // Review actions
  const deleteReview = async (id: string) => {
    if (!confirm('Удалить этот отзыв?')) return;
    setActionLoading(`review-${id}`);
    try {
      await reviewsApi.adminDelete(id);
      setReviews(prev => prev.filter(r => r.id !== id));
      showMsg('Отзыв удалён');
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Ошибка', 'error');
    } finally {
      setActionLoading('');
    }
  };

  // Plan actions
  const openEditPlan = (p: Tariff) => { setEditPlan(p); setPName(p.name); setPTier(p.tier); setPPrice(p.price.toString()); setPRam(p.ram.toString()); setPCores(p.cores.toString()); setPDisk(p.disk.toString()); setPFeatures(p.features.join('\n')); setPIcon(p.icon); setPDesc(p.description); setPPopular(p.popular); setNewPlan(false); };
  const openNewPlan = () => { setEditPlan(null); setPName(''); setPTier(''); setPPrice(''); setPRam(''); setPCores(''); setPDisk(''); setPFeatures(''); setPIcon('fa-cube'); setPDesc(''); setPPopular(false); setNewPlan(true); };
  const savePlan = async () => {
    const data = { name: pName, tier: pTier, price: parseFloat(pPrice), ram: parseInt(pRam), cores: parseInt(pCores), disk: parseInt(pDisk), features: pFeatures.split('\n').filter(Boolean), icon: pIcon, description: pDesc, popular: pPopular };
    try {
      if (editPlan) { await plansApi.update(editPlan.id, data); showMsg('Тариф обновлён'); }
      else { await plansApi.create(data); showMsg('Тариф создан'); }
      reload(); setEditPlan(null); setNewPlan(false);
    } catch (e) { showMsg(e instanceof Error ? e.message : '', 'error'); }
  };
  const removePlan = async (id: string) => { if (!confirm('Удалить тариф?')) return; try { await plansApi.delete(id); reload(); showMsg('Тариф удалён'); } catch (e) { showMsg(e instanceof Error ? e.message : '', 'error'); } };

  // Ptero actions
  const pteroSuspendS = async (sid: number) => { setActionLoading(`p${sid}`); try { await pteroApi.suspend(sid); showMsg(`#${sid} приостановлен`); loadPtero(); } catch (e) { showMsg(e instanceof Error ? e.message : '', 'error'); } finally { setActionLoading(''); } };
  const pteroUnsuspendS = async (sid: number) => { setActionLoading(`p${sid}`); try { await pteroApi.unsuspend(sid); showMsg(`#${sid} возобновлён`); loadPtero(); } catch (e) { showMsg(e instanceof Error ? e.message : '', 'error'); } finally { setActionLoading(''); } };
  const pteroDeleteS = async (sid: number) => { if (!confirm(`Удалить #${sid}?`)) return; setActionLoading(`p${sid}`); try { await pteroApi.deleteServer(sid); showMsg(`#${sid} удалён`); loadPtero(); } catch (e) { showMsg(e instanceof Error ? e.message : '', 'error'); } finally { setActionLoading(''); } };

  const openEditServer = (s: GameServer) => {
    setEditServer(s);
    setEsName(s.name);
    setEsTariffId(s.tariffId || '');
    setEsRam(s.ram.toString());
    setEsCores(s.cores.toString());
    setEsDisk(s.disk.toString());
    setEsPrice(s.price.toString());
    setEsExtendDays('');
  };

  const handleTariffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tariffId = e.target.value;
    setEsTariffId(tariffId);
    const tariff = plans.find(p => p.id === tariffId);
    if (tariff) {
      setEsRam(tariff.ram.toString());
      setEsCores(tariff.cores.toString());
      setEsDisk(tariff.disk.toString());
      setEsPrice(tariff.price.toString());
    }
  };

  const saveEditServer = async () => {
    if (!editServer) return;
    const data: any = {
      name: esName,
      ram: parseInt(esRam),
      cores: parseInt(esCores),
      disk: parseInt(esDisk),
      price: parseFloat(esPrice),
    };
    if (esTariffId) {
      data.tariffId = esTariffId;
      const tariff = plans.find(p => p.id === esTariffId);
      if (tariff) {
        data.tariffName = tariff.name;
        data.tariffTier = tariff.tier;
      }
    }
    if (esExtendDays) {
      const days = parseInt(esExtendDays);
      if (days > 0) {
        const newExpires = new Date(editServer.expiresAt);
        newExpires.setDate(newExpires.getDate() + days);
        data.expiresAt = newExpires.toISOString();
      }
    }
    try {
      await adminApi.updateServer(editServer.id, data);
      reload();
      setEditServer(null);
      showMsg('Сервер обновлён');
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Ошибка', 'error');
    }
  };

  const statusBadge = (s: string) => {
    if (s === 'active') return <Badge color="#34d399">Активен</Badge>;
    if (s === 'suspended') return <Badge color="#fbbf24">Заблокирован</Badge>;
    return <Badge color="#6b7280">Истёк</Badge>;
  };

  const roleBadge = (r: string) => {
    const config = {
      admin: { color: '#ef4444', label: 'Админ' },
      support: { color: '#fbbf24', label: 'Саппорт' },
      user: { color: 'var(--blue-3)', label: 'Юзер' },
    };
    const c = config[r] || config.user;
    return <Badge color={c.color}>{c.label}</Badge>;
  };

  const planModal = (editPlan || newPlan) && (
    <div className="modal-overlay" onClick={() => { setEditPlan(null); setNewPlan(false); }}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-tag" style={{ color: 'var(--blue-3)' }} />
          {editPlan ? 'Редактирование тарифа' : 'Новый тариф'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group"><label>Название</label><input className="form-input" value={pName} onChange={e => setPName(e.target.value)} placeholder="Lite" /></div>
          <div className="form-group"><label>Уровень</label><input className="form-input" value={pTier} onChange={e => setPTier(e.target.value)} placeholder="Кролик" /></div>
          <div className="form-group"><label>Цена (₽/мес)</label><input className="form-input" type="number" value={pPrice} onChange={e => setPPrice(e.target.value)} /></div>
          <div className="form-group"><label>Иконка (FA)</label><input className="form-input" value={pIcon} onChange={e => setPIcon(e.target.value)} placeholder="fa-cube" /></div>
          <div className="form-group"><label>RAM (МБ)</label><input className="form-input" type="number" value={pRam} onChange={e => setPRam(e.target.value)} /></div>
          <div className="form-group"><label>CPU (ядра)</label><input className="form-input" type="number" value={pCores} onChange={e => setPCores(e.target.value)} /></div>
          <div className="form-group"><label>Диск (МБ)</label><input className="form-input" type="number" value={pDisk} onChange={e => setPDisk(e.target.value)} /></div>
          <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={pPopular} onChange={e => setPPopular(e.target.checked)} /> Популярный</label></div>
        </div>
        <div className="form-group"><label>Описание</label><input className="form-input" value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder="Для небольших серверов" /></div>
        <div className="form-group"><label>Характеристики (по строке)</label><textarea className="form-input" rows={4} value={pFeatures} onChange={e => setPFeatures(e.target.value)} placeholder="3 ГБ RAM&#10;1 ядро&#10;25 ГБ SSD" /></div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={() => { setEditPlan(null); setNewPlan(false); }}>Отмена</button>
          <button className="btn btn-fill" onClick={savePlan}><i className="fas fa-save" /> Сохранить</button>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="dash-title">Админ панель</h1>
      <p className="dash-subtitle">Управление системой</p>

      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              marginBottom: 20,
              background: msgType === 'error' ? 'rgba(239,68,68,.1)' : 'rgba(52,211,153,.1)',
              border: `1px solid ${msgType === 'error' ? 'rgba(239,68,68,.2)' : 'rgba(52,211,153,.2)'}`,
              color: msgType === 'error' ? '#ef4444' : '#34d399',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span><i className={`fas ${msgType === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`} style={{ marginRight: 8 }} />{msg}</span>
            <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
              <i className="fas fa-times" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 12, padding: 4 }}>
        {([
          ['servers', 'fa-server', `Серверы (${servers.length})`],
          ['users', 'fa-users', `Пользователи (${users.length})`],
          ['tickets', 'fa-ticket', `Тикеты (${tickets.filter(t => t.status !== 'closed').length})`],
          ['plans', 'fa-tag', `Тарифы (${plans.length})`],
          ['ptero', 'fa-dragon', 'Pterodactyl'],
          ['reviews', 'fa-star', `Отзывы (${reviews.length})`]  // новая вкладка
        ] as [Tab, string, string][]).map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setActiveTicket(null); }}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 8,
              border: 'none',
              background: tab === key ? 'var(--blue-1)' : 'transparent',
              color: tab === key ? '#fff' : 'var(--text-dim)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: '.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <i className={`fas ${icon}`} />
            {label}
          </button>
        ))}
      </div>

      {/* Содержимое вкладок */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Серверы */}
          {tab === 'servers' && (
            <div className="dash-card" style={{ overflowX: 'auto', padding: 0 }}>
              {servers.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 28 }}>Нет серверов</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'rgba(255,255,255,.02)', borderBottom: '1px solid var(--border-dim)' }}>
                    <tr>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 600 }}>Название</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 600 }}>Владелец</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 600 }}>Тариф</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 600 }}>IP</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 600 }}>Статус</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 600 }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servers.map((s) => {
                      const owner = users.find(u => u.id === s.userId);
                      const ld = actionLoading === s.id;
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-dim)', transition: '.2s' }}>
                          <td style={{ padding: '14px 12px', fontWeight: 600 }}>{s.name}</td>
                          <td style={{ padding: '14px 12px' }}>{owner?.username || '—'}</td>
                          <td style={{ padding: '14px 12px' }}>{s.tariffTier} {s.tariffName}</td>
                          <td style={{ padding: '14px 12px', fontFamily: 'monospace', fontSize: 12 }}>{s.ip ? `${s.ip}:${s.port}` : '—'}</td>
                          <td style={{ padding: '14px 12px' }}>{statusBadge(s.status)}</td>
                          <td style={{ padding: '14px 12px', display: 'flex', gap: 6 }}>
                            <ActionButton variant="default" onClick={() => openEditServer(s)} icon="fa-edit">Изменить</ActionButton>
                            <ActionButton
                              variant={s.status === 'suspended' ? 'success' : 'warn'}
                              onClick={() => toggleSuspend(s)}
                              disabled={ld}
                              loading={ld}
                              icon={s.status === 'suspended' ? 'fa-play' : 'fa-pause'}
                            >
                              {s.status === 'suspended' ? 'Разблок.' : 'Заблок.'}
                            </ActionButton>
                            <ActionButton variant="success" onClick={() => { setExtendServer(s); setExtendMonths(1); }} icon="fa-calendar-plus">
                              Продлить
                            </ActionButton>
                            <ActionButton variant="danger" onClick={() => removeServer(s)} disabled={ld} loading={ld} icon="fa-trash">
                              Удалить
                            </ActionButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Пользователи */}
          {tab === 'users' && (
            <div className="dash-card" style={{ overflowX: 'auto', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'rgba(255,255,255,.02)', borderBottom: '1px solid var(--border-dim)' }}>
                  <tr>
                    <th style={{ padding: '16px 12px', textAlign: 'left' }}>Пользователь</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left' }}>Почта</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left' }}>Баланс</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left' }}>Роль</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left' }}>Статус</th>
                    <th style={{ padding: '16px 12px', textAlign: 'left' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <td style={{ padding: '14px 12px', fontWeight: 600 }}>{u.username}</td>
                      <td style={{ padding: '14px 12px', fontSize: 12 }}>{u.email}</td>
                      <td style={{ padding: '14px 12px', fontWeight: 600 }}>{u.balance.toLocaleString()}₽</td>
                      <td style={{ padding: '14px 12px' }}>{roleBadge(u.role)}</td>
                      <td style={{ padding: '14px 12px' }}>
                        {u.blocked ? <Badge color="#ef4444">Заблокирован</Badge> : <Badge color="#34d399">Активен</Badge>}
                      </td>
                      <td style={{ padding: '14px 12px', display: 'flex', gap: 6 }}>
                        <ActionButton variant="default" onClick={() => openEditUser(u)} icon="fa-edit">Изменить</ActionButton>
                        <ActionButton variant="danger" onClick={() => removeUser(u)} icon="fa-trash">Удалить</ActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Тикеты */}
          {tab === 'tickets' && !activeTicket && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                <span>Всего тикетов: {tickets.length}</span>
                <button 
                  className="btn btn-danger" 
                  onClick={() => setShowDeleteAllModal(true)}
                  disabled={actionLoading === 'delete-all'}
                  style={{ 
                    background: 'rgba(239,68,68,.1)', 
                    border: '1px solid rgba(239,68,68,.2)', 
                    color: '#ef4444',
                    padding: '8px 16px',
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    opacity: actionLoading === 'delete-all' ? 0.7 : 1,
                  }}
                >
                  {actionLoading === 'delete-all' ? (
                    <><i className="fas fa-spinner fa-spin" /> Удаление...</>
                  ) : (
                    <><i className="fas fa-trash-alt" /> Удалить все тикеты</>
                  )}
                </button>
              </div>
              <div className="dash-card" style={{ overflowX: 'auto', padding: 0 }}>
                {tickets.length === 0 ? (
                  <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 28 }}>Тикетов нет</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'rgba(255,255,255,.02)', borderBottom: '1px solid var(--border-dim)' }}>
                      <tr>
                        <th style={{ padding: '16px 12px', textAlign: 'left' }}>Тема</th>
                        <th style={{ padding: '16px 12px', textAlign: 'left' }}>Пользователь</th>
                        <th style={{ padding: '16px 12px', textAlign: 'left' }}>Статус</th>
                        <th style={{ padding: '16px 12px', textAlign: 'left' }}>Дата</th>
                        <th style={{ padding: '16px 12px', textAlign: 'left' }}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.sort((a, b) => {
                        const order = { open: 0, answered: 1, closed: 2 };
                        return (order[a.status] || 0) - (order[b.status] || 0);
                      }).map((t) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                          <td style={{ padding: '14px 12px', fontWeight: 600 }}>{t.subject}</td>
                          <td style={{ padding: '14px 12px' }}>{t.username}</td>
                          <td style={{ padding: '14px 12px' }}>
                            <Badge color={t.status === 'open' ? '#34d399' : t.status === 'answered' ? '#3b82f6' : '#6b7280'}>
                              {t.status === 'open' ? 'Открыт' : t.status === 'answered' ? 'Отвечен' : 'Закрыт'}
                            </Badge>
                          </td>
                          <td style={{ padding: '14px 12px', fontSize: 12 }}>{new Date(t.createdAt).toLocaleDateString('ru-RU')}</td>
                          <td style={{ padding: '14px 12px', display: 'flex', gap: 6 }}>
                            <ActionButton variant="default" onClick={() => setActiveTicket(t)} icon="fa-eye">Открыть</ActionButton>
                            {t.status !== 'closed' && (
                              <ActionButton variant="warn" onClick={() => handleTicketClose(t)} icon="fa-times">Закрыть</ActionButton>
                            )}
                            <ActionButton 
                              variant="danger" 
                              onClick={() => deleteTicket(t.id)} 
                              disabled={actionLoading === `ticket-${t.id}`}
                              loading={actionLoading === `ticket-${t.id}`}
                              icon="fa-trash"
                            >
                              Удалить
                            </ActionButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {tab === 'tickets' && activeTicket && (
            <div>
              <button className="btn btn-ghost" onClick={() => setActiveTicket(null)} style={{ marginBottom: 16, fontSize: 12, padding: '8px 16px' }}>
                <i className="fas fa-arrow-left" /> Все тикеты
              </button>
              <div className="dash-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 18, marginBottom: 16 }}>{activeTicket.subject}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  {activeTicket.messages.map(m => (
                    <div key={m.id} style={{
                      padding: '16px',
                      borderRadius: 12,
                      background: m.isStaff ? 'rgba(37,99,235,.06)' : 'rgba(255,255,255,.02)',
                      borderLeft: `4px solid ${m.isStaff ? 'var(--blue-1)' : 'var(--border-light)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: m.isStaff ? 'var(--blue-3)' : 'var(--text-white)' }}>
                          {m.isStaff && <i className="fas fa-shield-halved" style={{ marginRight: 6, fontSize: 12 }} />}
                          {m.authorName}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{new Date(m.createdAt).toLocaleString('ru-RU')}</span>
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--text-gray)', lineHeight: 1.6 }}>{m.content}</div>
                    </div>
                  ))}
                </div>
                {activeTicket.status !== 'closed' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="Ваш ответ..."
                      value={ticketReply}
                      onChange={e => setTicketReply(e.target.value)}
                      style={{ flex: 1, resize: 'vertical' }}
                    />
                    <button className="btn btn-fill" onClick={handleTicketReply} style={{ padding: '12px 24px', alignSelf: 'flex-end' }}>
                      <i className="fas fa-paper-plane" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Тарифы */}
          {tab === 'plans' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="btn btn-fill" onClick={openNewPlan}>
                  <i className="fas fa-plus" /> Новый тариф
                </button>
              </div>
              <div className="dash-card" style={{ overflowX: 'auto', padding: 0 }}>
                {plans.length === 0 ? (
                  <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 28 }}>Тарифов нет</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'rgba(255,255,255,.02)', borderBottom: '1px solid var(--border-dim)' }}>
                      <tr>
                        <th style={{ padding: '16px 12px', textAlign: 'left' }}>Название</th>
                        <th style={{ padding: '16px 12px', textAlign: 'left' }}>Уровень</th>
                        <th style={{ padding: '16px 12px', textAlign: 'left' }}>Цена</th>
                        <th style={{ padding: '16px 12px', textAlign: 'left' }}>RAM</th>
                        <th style={{ padding: '16px 12px', textAlign: 'left' }}>CPU</th>
                        <th style={{ padding: '16px 12px', textAlign: 'left' }}>Диск</th>
                        <th style={{ padding: '16px 12px', textAlign: 'left' }}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                          <td style={{ padding: '14px 12px', fontWeight: 600 }}>
                            {p.name} {p.popular && <span style={{ marginLeft: 6, background: 'var(--blue-1)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 12 }}>★</span>}
                          </td>
                          <td style={{ padding: '14px 12px' }}>{p.tier}</td>
                          <td style={{ padding: '14px 12px', fontWeight: 700 }}>{p.price}₽</td>
                          <td style={{ padding: '14px 12px' }}>{p.ram >= 1024 ? (p.ram / 1024).toFixed(0) + ' ГБ' : p.ram + ' МБ'}</td>
                          <td style={{ padding: '14px 12px' }}>{p.cores}</td>
                          <td style={{ padding: '14px 12px' }}>{p.disk >= 1024 ? (p.disk / 1024).toFixed(0) + ' ГБ' : p.disk + ' МБ'}</td>
                          <td style={{ padding: '14px 12px', display: 'flex', gap: 6 }}>
                            <ActionButton variant="default" onClick={() => openEditPlan(p)} icon="fa-edit">Изменить</ActionButton>
                            <ActionButton variant="danger" onClick={() => removePlan(p.id)} icon="fa-trash">Удалить</ActionButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Pterodactyl */}
          {tab === 'ptero' && (
            <div>
              <div className="dash-card" style={{ background: pteroConnected === true ? 'rgba(52,211,153,.04)' : pteroConnected === false ? 'rgba(239,68,68,.04)' : undefined, padding: 20 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: pteroConnected ? 'rgba(52,211,153,.1)' : 'rgba(239,68,68,.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                    color: pteroConnected ? '#34d399' : '#ef4444'
                  }}>
                    <i className={`fas ${pteroConnected ? 'fa-check-circle' : 'fa-times-circle'}`} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 4 }}>Pterodactyl — {pteroConnected ? 'Подключено' : 'Не подключено'}</h3>
                  </div>
                  <ActionButton variant="default" onClick={testPtero} disabled={testLoading} loading={testLoading} icon="fa-plug">
                    {testLoading ? 'Проверка...' : 'Тест'}
                  </ActionButton>
                </div>
              </div>

              {pteroLoading && (
                <div className="dash-card" style={{ textAlign: 'center', padding: 40 }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--blue-3)' }} />
                </div>
              )}

              {pteroError && (
                <div className="dash-card" style={{ background: 'rgba(239,68,68,.04)', padding: 20 }}>
                  <p style={{ color: '#ef4444', marginBottom: 12 }}>{pteroError}</p>
                  <ActionButton variant="default" onClick={loadPtero} icon="fa-redo">Повторить</ActionButton>
                </div>
              )}

              {pteroData && (
                <div className="dash-card" style={{ overflowX: 'auto', padding: 0, marginTop: 16 }}>
                  <h3 style={{ padding: '20px 20px 0', fontSize: 16 }}>Серверы ({pteroData.servers.length})</h3>
                  {pteroData.servers.length === 0 ? (
                    <p style={{ color: 'var(--text-dim)', padding: 20 }}>Нет серверов в Pterodactyl</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ background: 'rgba(255,255,255,.02)', borderBottom: '1px solid var(--border-dim)' }}>
                        <tr>
                          <th style={{ padding: '16px 12px', textAlign: 'left' }}>ID</th>
                          <th style={{ padding: '16px 12px', textAlign: 'left' }}>Название</th>
                          <th style={{ padding: '16px 12px', textAlign: 'left' }}>User</th>
                          <th style={{ padding: '16px 12px', textAlign: 'left' }}>Статус</th>
                          <th style={{ padding: '16px 12px', textAlign: 'left' }}>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pteroData.servers.map((s: any) => {
                          const a = s.attributes;
                          const sid = a.id;
                          const susp = a.suspended;
                          const ld = actionLoading === `p${sid}`;
                          return (
                            <tr key={sid} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                              <td style={{ padding: '14px 12px', fontFamily: 'monospace', color: 'var(--blue-3)' }}>#{sid}</td>
                              <td style={{ padding: '14px 12px', fontWeight: 600 }}>{a.name}</td>
                              <td style={{ padding: '14px 12px' }}>#{a.user}</td>
                              <td style={{ padding: '14px 12px' }}>
                                {susp ? <Badge color="#fbbf24">Suspended</Badge> : <Badge color="#34d399">Active</Badge>}
                              </td>
                              <td style={{ padding: '14px 12px', display: 'flex', gap: 6 }}>
                                {susp ? (
                                  <ActionButton variant="success" onClick={() => pteroUnsuspendS(sid)} disabled={ld} loading={ld} icon="fa-play">
                                    Unsuspend
                                  </ActionButton>
                                ) : (
                                  <ActionButton variant="warn" onClick={() => pteroSuspendS(sid)} disabled={ld} loading={ld} icon="fa-pause">
                                    Suspend
                                  </ActionButton>
                                )}
                                <ActionButton variant="danger" onClick={() => pteroDeleteS(sid)} disabled={ld} loading={ld} icon="fa-trash">
                                  Удалить
                                </ActionButton>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Отзывы */}
          {tab === 'reviews' && (
            <div className="dash-card" style={{ overflowX: 'auto', padding: 0 }}>
              {reviews.length === 0 ? (
                <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 28 }}>Отзывов пока нет</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'rgba(255,255,255,.02)', borderBottom: '1px solid var(--border-dim)' }}>
                    <tr>
                      <th style={{ padding: '16px 12px', textAlign: 'left' }}>Пользователь</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left' }}>Email</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left' }}>Оценка</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left' }}>Отзыв</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left' }}>Дата</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                        <td style={{ padding: '14px 12px', fontWeight: 600 }}>{r.userName}</td>
                        <td style={{ padding: '14px 12px', fontSize: 12 }}>{r.email}</td>
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {[1,2,3,4,5].map(i => (
                              <i key={i} className="fas fa-star" style={{ color: i <= r.rating ? '#fbbf24' : 'var(--border-light)', fontSize: 12 }} />
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '14px 12px', maxWidth: 300 }}>
                          <div style={{ 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap' 
                          }}>
                            {r.text}
                          </div>
                        </td>
                        <td style={{ padding: '14px 12px', fontSize: 12 }}>
                          {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                        </td>
                        <td style={{ padding: '14px 12px', display: 'flex', gap: 6 }}>
                          <ActionButton 
                            variant="danger" 
                            onClick={() => deleteReview(r.id)} 
                            disabled={actionLoading === `review-${r.id}`}
                            loading={actionLoading === `review-${r.id}`}
                            icon="fa-trash"
                          >
                            Удалить
                          </ActionButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Модальные окна */}
      <AnimatePresence>
        {editUser && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditUser(null)}>
            <motion.div className="modal-card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-user-edit" style={{ color: 'var(--blue-3)' }} /> Редактирование пользователя
              </h2>
              <div className="form-group"><label>Имя</label><input className="form-input" value={euUsername} onChange={e => setEuUsername(e.target.value)} /></div>
              <div className="form-group"><label>Почта</label><input className="form-input" type="email" value={euEmail} onChange={e => setEuEmail(e.target.value)} /></div>
              <div className="form-group"><label>Пароль (пусто=не менять)</label><input className="form-input" type="password" value={euPassword} onChange={e => setEuPassword(e.target.value)} /></div>
              <div className="form-group"><label>Баланс (₽)</label><input className="form-input" type="number" value={euBalance} onChange={e => setEuBalance(e.target.value)} /></div>
              <div className="form-group"><label>Роль</label>
                <select className="form-input" value={euRole} onChange={e => setEuRole(e.target.value as any)}>
                  <option value="user">Юзер</option>
                  <option value="support">Саппорт</option>
                  <option value="admin">Админ</option>
                </select>
              </div>
              <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 10 }}><input type="checkbox" checked={euBlocked} onChange={e => setEuBlocked(e.target.checked)} /> Заблокировать</label></div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="btn btn-ghost" onClick={() => setEditUser(null)}>Отмена</button>
                <button className="btn btn-fill" onClick={saveEditUser}><i className="fas fa-save" /> Сохранить</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {extendServer && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExtendServer(null)}>
            <motion.div className="modal-card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-calendar-plus" style={{ color: 'var(--blue-3)' }} /> Продление сервера
              </h2>
              <p style={{ marginBottom: 20 }}>Сервер: <strong>{extendServer.name}</strong></p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
                {[1, 3, 6, 12].map(m => (
                  <button
                    key={m}
                    onClick={() => setExtendMonths(m)}
                    style={{
                      padding: '16px',
                      borderRadius: 12,
                      border: `2px solid ${extendMonths === m ? 'var(--blue-1)' : 'var(--border-dim)'}`,
                      background: extendMonths === m ? 'rgba(37,99,235,.08)' : 'var(--bg-card)',
                      color: extendMonths === m ? 'var(--text-white)' : 'var(--text-dim)',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    <div style={{ fontSize: 24, fontWeight: 800 }}>{m}</div>
                    <div style={{ fontSize: 12 }}>{m === 1 ? 'месяц' : m < 5 ? 'месяца' : 'месяцев'}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setExtendServer(null)}>Отмена</button>
                <button className="btn btn-fill" onClick={doExtend}><i className="fas fa-check" /> Продлить</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {editServer && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditServer(null)}>
            <motion.div className="modal-card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-server" style={{ color: 'var(--blue-3)' }} /> Редактирование сервера
              </h2>
              <div className="form-group">
                <label>Название</label>
                <input className="form-input" value={esName} onChange={e => setEsName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Тариф</label>
                <select className="form-input" value={esTariffId} onChange={handleTariffChange}>
                  <option value="">— Без тарифа —</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.tier} {p.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div className="form-group">
                  <label>RAM (МБ)</label>
                  <input className="form-input" type="number" value={esRam} onChange={e => setEsRam(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>CPU (ядра)</label>
                  <input className="form-input" type="number" value={esCores} onChange={e => setEsCores(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Диск (МБ)</label>
                  <input className="form-input" type="number" value={esDisk} onChange={e => setEsDisk(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Цена (₽/мес)</label>
                  <input className="form-input" type="number" step="0.01" value={esPrice} onChange={e => setEsPrice(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Продлить на дней (опционально)</label>
                <input className="form-input" type="number" placeholder="0" value={esExtendDays} onChange={e => setEsExtendDays(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="btn btn-ghost" onClick={() => setEditServer(null)}>Отмена</button>
                <button className="btn btn-fill" onClick={saveEditServer}><i className="fas fa-save" /> Сохранить</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showDeleteAllModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteAllModal(false)}>
            <motion.div className="modal-card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
                <i className="fas fa-exclamation-triangle" /> Удалить все тикеты?
              </h2>
              <p style={{ marginBottom: 24 }}>Вы уверены, что хотите удалить <strong>все</strong> тикеты и все сообщения? Это действие необратимо.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowDeleteAllModal(false)}>Отмена</button>
                <button className="btn btn-fill" onClick={deleteAllTickets} style={{ background: '#ef4444' }}>
                  <i className="fas fa-trash" /> Удалить всё
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {planModal}
    </motion.div>
  );
}