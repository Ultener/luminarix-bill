import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { Ticket, ticketsApi, serversApi, GameServer, adminApi } from '../store';

const DEPARTMENTS = [
  { id: 'tech', name: 'Технический', icon: 'fa-wrench' },
  { id: 'purchase', name: 'Приобрести', icon: 'fa-shopping-cart' },
  { id: 'server', name: 'Проблема с сервером', icon: 'fa-server' },
  { id: 'general', name: 'Общий вопрос', icon: 'fa-circle-question' },
  { id: 'other', name: 'Другое', icon: 'fa-tag' },
];

const PRIORITIES = [
  { id: 'low', name: 'Низкий приоритет', color: '#34d399' },
  { id: 'medium', name: 'Средний приоритет', color: '#fbbf24' },
  { id: 'high', name: 'Высокий приоритет', color: '#ef4444' },
];

const SERVICE_TYPES = [
  { id: 'game', name: 'Игровые сервера' },
  { id: 'none', name: 'Услуга не выбрана' },
];

// Функция для очистки сообщения от служебных меток
const cleanMessage = (msg: string) => {
  return msg
    .split('\n')
    .filter(line => !line.startsWith('[Приоритет:') && !line.startsWith('[Тип услуги:') && !line.startsWith('[Сервер:'))
    .join('\n')
    .trim();
};

export default function Tickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [servers, setServers] = useState<GameServer[]>([]);
  const [view, setView] = useState<'list' | 'detail' | 'new'>('list');
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0].id);
  const [priority, setPriority] = useState(PRIORITIES[0].id);
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0].id);
  const [selectedServer, setSelectedServer] = useState<GameServer | null>(null);

  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [imgPreviews, setImgPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Состояния для удаления (только для админа)
  const [deletingAll, setDeletingAll] = useState(false);
  const isAdmin = user?.role === 'admin' || user?.isAdmin;

  useEffect(() => {
    loadTickets();
    loadServers();
  }, []);

  const loadTickets = () => {
    ticketsApi.list().then(setTickets).catch(() => {});
  };

  const loadServers = () => {
    serversApi.list().then(setServers).catch(() => {});
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPreviews: string[] = [];
    Array.from(files).forEach(f => {
      if (f.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) {
          newPreviews.push(ev.target.result as string);
          if (newPreviews.length === files.length) setImgPreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (idx: number) => setImgPreviews(prev => prev.filter((_, i) => i !== idx));

  const handleCreate = async () => {
    setError('');
    if (!subject.trim()) { setError('Введите тему'); return; }
    if (!message.trim()) { setError('Введите сообщение'); return; }

    try {
      // Формируем сообщение с техническими метками
      let fullMessage = `[Приоритет: ${PRIORITIES.find(p => p.id === priority)?.name}]\n`;
      fullMessage += `[Тип услуги: ${SERVICE_TYPES.find(s => s.id === serviceType)?.name}]\n`;
      if (selectedServer) {
        fullMessage += `[Сервер: ${selectedServer.name} (${selectedServer.id})]\n`;
      }
      fullMessage += `\n${message}`;

      if (imgPreviews.length > 0) {
        fullMessage += `\n\n[Прикреплено изображений: ${imgPreviews.length}]`;
      }

      await ticketsApi.create(
        subject,
        DEPARTMENTS.find(d => d.id === department)!.name,
        fullMessage
      );
      setSubject('');
      setMessage('');
      setDepartment(DEPARTMENTS[0].id);
      setPriority(PRIORITIES[0].id);
      setServiceType(SERVICE_TYPES[0].id);
      setSelectedServer(null);
      setImgPreviews([]);
      loadTickets();
      setView('list');
    } catch (e) {
      if (e instanceof Error && e.message.includes('через')) {
        setError(e.message); // Показываем точное сообщение с оставшимся временем
      } else {
        setError(e instanceof Error ? e.message : 'Ошибка');
      }
    }
  };

  const handleReply = async () => {
    if (!activeTicket || !reply.trim()) return;
    try {
      const updated = await ticketsApi.reply(activeTicket.id, reply);
      setActiveTicket(updated);
      setReply('');
      loadTickets();
    } catch { /* ignore */ }
  };

  const handleClose = async () => {
    if (!activeTicket) return;
    try {
      await ticketsApi.close(activeTicket.id);
      loadTickets();
      setView('list');
      setActiveTicket(null);
    } catch { /* ignore */ }
  };

  // Функции удаления (только для админа)
  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот тикет? Это действие нельзя отменить.')) return;
    try {
      await adminApi.deleteTicket(ticketId);
      loadTickets();
      if (activeTicket?.id === ticketId) {
        setView('list');
        setActiveTicket(null);
      }
    } catch (e) {
      alert('Ошибка при удалении тикета');
    }
  };

  const handleDeleteAllTickets = async () => {
    if (!confirm('ВНИМАНИЕ! Вы собираетесь удалить ВСЕ тикеты. Это действие необратимо. Продолжить?')) return;
    setDeletingAll(true);
    try {
      await adminApi.deleteAllTickets();
      setTickets([]);
      setView('list');
      setActiveTicket(null);
    } catch (e) {
      alert('Ошибка при удалении всех тикетов');
    } finally {
      setDeletingAll(false);
    }
  };

  const statusInfo = (s: string) =>
    s === 'open' ? { label: 'Открыт', color: '#34d399', bg: 'rgba(52,211,153,.1)' }
    : s === 'answered' ? { label: 'Отвечен', color: '#3b82f6', bg: 'rgba(59,130,246,.1)' }
    : { label: 'Закрыт', color: '#6b7280', bg: 'rgba(255,255,255,.04)' };

  const getDepartmentInfo = (deptName: string) => {
    const found = DEPARTMENTS.find(d => d.name === deptName);
    return {
      icon: found?.icon || 'fa-tag',
      color: '#6b7280',
    };
  };

  const extractPriority = (ticket: Ticket) => {
    const firstMsg = ticket.messages[0]?.content || '';
    if (firstMsg.includes('[Приоритет: Низкий приоритет]')) return 'Низкий';
    if (firstMsg.includes('[Приоритет: Средний приоритет]')) return 'Средний';
    if (firstMsg.includes('[Приоритет: Высокий приоритет]')) return 'Высокий';
    return 'Не указан';
  };

  const extractServiceType = (ticket: Ticket) => {
    const firstMsg = ticket.messages[0]?.content || '';
    if (firstMsg.includes('[Тип услуги: Игровые сервера]')) return 'Игровые сервера';
    if (firstMsg.includes('[Тип услуги: Услуга не выбрана]')) return 'Услуга не выбрана';
    return 'Не указана';
  };

  const lastMessage = activeTicket?.messages[activeTicket.messages.length - 1];

  return (
    <div>
      {/* Заголовок и кнопки навигации */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="dash-title">Тикеты</h1>
          <p className="dash-subtitle" style={{ marginBottom: 0 }}>Обратитесь в поддержку</p>
        </div>
        {view === 'list' && (
          <div style={{ display: 'flex', gap: 8 }}>
            {isAdmin && (
              <button
                className="btn btn-ghost"
                onClick={handleDeleteAllTickets}
                disabled={deletingAll}
                style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,.3)' }}
              >
                {deletingAll ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-trash-alt" />} Удалить все
              </button>
            )}
            <button className="btn btn-fill" onClick={() => setView('new')}>
              <i className="fas fa-plus" /> Новый тикет
            </button>
          </div>
        )}
        {view !== 'list' && (
          <button className="btn btn-ghost" onClick={() => { setView('list'); setActiveTicket(null); setImgPreviews([]); }}>
            <i className="fas fa-arrow-left" /> Назад
          </button>
        )}
      </div>

      {/* Форма создания тикета */}
      {view === 'new' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 14, padding: 28 }}>
          <h3 style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>
            Создать обращение
          </h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 24 }}>
            Здесь вы можете создать новое обращение в нашу службу поддержки
          </p>

          {error && (
            <div className="form-error" style={{ marginBottom: 16 }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />{error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              Тема вашего обращения <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="form-input"
              placeholder="Коротко опишите проблему"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              Распишите подробнее <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              className="form-input"
              rows={5}
              placeholder="Подробно опишите ваш вопрос или проблему"
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{ resize: 'vertical', minHeight: 120 }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              Выберите департамент <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {DEPARTMENTS.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDepartment(d.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: `2px solid ${department === d.id ? 'var(--blue-1)' : 'var(--border-dim)'}`,
                    background: department === d.id ? 'rgba(37,99,235,.08)' : 'transparent',
                    color: department === d.id ? 'var(--text-white)' : 'var(--text-dim)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: '.2s',
                  }}
                >
                  <i className={`fas ${d.icon}`} style={{ color: 'var(--blue-3)' }} />
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              Выберите приоритет <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {PRIORITIES.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: `2px solid ${priority === p.id ? p.color : 'var(--border-dim)'}`,
                    background: priority === p.id ? `${p.color}15` : 'transparent',
                    color: priority === p.id ? p.color : 'var(--text-dim)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: '.2s',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              Выберите тип связанной услуги <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {SERVICE_TYPES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setServiceType(s.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: `2px solid ${serviceType === s.id ? 'var(--blue-1)' : 'var(--border-dim)'}`,
                    background: serviceType === s.id ? 'rgba(37,99,235,.08)' : 'transparent',
                    color: serviceType === s.id ? 'var(--text-white)' : 'var(--text-dim)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: '.2s',
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {servers.length > 0 && (
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                Привязать к серверу (опционально)
              </label>
              <select
                value={selectedServer?.id || ''}
                onChange={(e) => {
                  const serverId = e.target.value;
                  if (serverId === '') {
                    setSelectedServer(null);
                  } else {
                    const server = servers.find(s => s.id === serverId);
                    setSelectedServer(server || null);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border-dim)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-white)',
                  fontSize: 14,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-dim)' }}>— Не выбран —</option>
                {servers.map(s => (
                  <option key={s.id} value={s.id} style={{ background: 'var(--bg-card)', color: 'var(--text-white)' }}>
                    {s.name} ({s.tariffTier} {s.tariffName})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Прикрепить изображения</label>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} />
            <div onClick={() => fileRef.current?.click()} style={{
              padding: '24px 20px', borderRadius: 10, border: '2px dashed var(--border-light)',
              background: 'rgba(37,99,235,.03)', cursor: 'pointer', textAlign: 'center', transition: '.2s',
            }}>
              <i className="fas fa-cloud-upload-alt" style={{ fontSize: 24, color: 'var(--blue-3)', marginBottom: 8, display: 'block' }} />
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Нажмите для загрузки (JPG, PNG, до 5MB)</div>
            </div>
            {imgPreviews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {imgPreviews.map((src, i) => (
                  <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-dim)' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={(e) => { e.stopPropagation(); removeImage(i); }} style={{
                      position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%',
                      background: 'rgba(239,68,68,.9)', border: 'none', color: '#fff', cursor: 'pointer',
                      fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><i className="fas fa-times" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-fill" onClick={handleCreate} style={{ width: '100%', padding: '14px', fontSize: 15 }}>
            <i className="fas fa-paper-plane" style={{ marginRight: 8 }} /> Отправить обращение
          </button>

          {/* Информационное сообщение о cooldown */}
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 16, textAlign: 'center' }}>
            <i className="fas fa-clock" style={{ marginRight: 6 }} /> Ограничение: не чаще 1 тикета в 15 минут.
          </p>
        </div>
      )}

      {/* Список тикетов */}
      {view === 'list' && (tickets.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 14, padding: '60px 28px', textAlign: 'center' }}>
          <i className="fas fa-ticket" style={{ fontSize: 44, opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ marginBottom: 8 }}>Тикетов пока нет</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>Создайте тикет, если вам нужна помощь</p>
          <button className="btn btn-fill" onClick={() => setView('new')}>
            <i className="fas fa-plus" /> Создать тикет
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(t => {
            const st = statusInfo(t.status);
            const deptInfo = getDepartmentInfo(t.category);
            return (
              <div
                key={t.id}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 14,
                  padding: 20, cursor: 'pointer', transition: '.25s',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-dim)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                onClick={() => { setActiveTicket(t); setView('detail'); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 11, fontWeight: 600, color: '#6b7280',
                    padding: '3px 10px', borderRadius: 6,
                    background: 'rgba(107,114,128,.1)',
                  }}>
                    <i className={`fas ${deptInfo.icon}`} style={{ fontSize: 10 }} />
                    {t.category}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
                    background: st.bg, color: st.color,
                  }}>{st.label}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{t.subject}</div>
                {t.messages[0] && (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                    {cleanMessage(t.messages[0].content)}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border-dim)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-dim)' }}>
                    <span><i className="fas fa-clock" style={{ marginRight: 4 }} />{new Date(t.createdAt).toLocaleDateString('ru-RU')}</span>
                    <span><i className="fas fa-comments" style={{ marginRight: 4 }} />{t.messages.length}</span>
                  </div>
                  <i className="fas fa-arrow-right" style={{ fontSize: 11, color: 'var(--text-dim)' }} />
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Детальный просмотр тикета — двухколоночный */}
      {view === 'detail' && activeTicket && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
          {/* Левая колонка — чат */}
          <div>
            {/* Информация о тикете сверху */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{activeTicket.subject}</h3>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                    <span><i className="fas fa-folder" style={{ marginRight: 4 }} />{activeTicket.category}</span>
                    <span><i className="fas fa-calendar" style={{ marginRight: 4 }} />{new Date(activeTicket.createdAt).toLocaleString('ru-RU')}</span>
                    <span><i className="fas fa-comments" style={{ marginRight: 4 }} />{activeTicket.messages.length} сообщ.</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                      background: statusInfo(activeTicket.status).bg,
                      color: statusInfo(activeTicket.status).color,
                    }}>{statusInfo(activeTicket.status).label}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {activeTicket.status !== 'closed' && (
                    <button className="btn btn-ghost" onClick={handleClose} style={{ fontSize: 12, padding: '6px 14px' }}>
                      <i className="fas fa-times" /> Закрыть
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleDeleteTicket(activeTicket.id)}
                      style={{ fontSize: 12, padding: '6px 14px', color: '#ef4444', borderColor: 'rgba(239,68,68,.3)' }}
                    >
                      <i className="fas fa-trash" /> Удалить
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Сообщения */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {activeTicket.messages.map(m => (
                  <div key={m.id} style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: m.isStaff ? 'rgba(37,99,235,.06)' : 'rgba(255,255,255,.02)',
                    borderLeft: `3px solid ${m.isStaff ? 'var(--blue-1)' : 'var(--border-light)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: m.isStaff ? 'var(--blue-3)' : 'var(--text-white)' }}>
                        {m.isStaff && <i className="fas fa-shield-halved" style={{ marginRight: 6, fontSize: 11 }} />}
                        {m.authorName}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {new Date(m.createdAt).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-gray)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{cleanMessage(m.content)}</div>
                  </div>
                ))}
              </div>
              {activeTicket.status !== 'closed' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    placeholder="Ваш ответ..."
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleReply()}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-fill" onClick={handleReply} style={{ padding: '12px 20px', flexShrink: 0 }}>
                    <i className="fas fa-paper-plane" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Правая колонка — информация о тикете */}
          <div className="dash-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Детали обращения</h3>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>№ обращения</div>
              <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>#{activeTicket.id.substring(0, 8)}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>Создан</div>
              <div style={{ fontWeight: 600 }}>{new Date(activeTicket.createdAt).toLocaleString('ru-RU')}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>Последнее сообщение</div>
              <div style={{ fontWeight: 600 }}>{lastMessage ? new Date(lastMessage.createdAt).toLocaleString('ru-RU') : '—'}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>Департамент</div>
              <div style={{ fontWeight: 600 }}>{activeTicket.category}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>Приоритет</div>
              <div style={{ fontWeight: 600 }}>{extractPriority(activeTicket)}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>Email</div>
              <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{user?.email}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>Услуга</div>
              <div style={{ fontWeight: 600 }}>{extractServiceType(activeTicket)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}