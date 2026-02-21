import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface NodeStatus {
  id: number;
  name: string;
  description: string | null;
  location_id: number | null;
  public: boolean;
  maintenance_mode: boolean;
  memory: number;           // в MiB
  memory_overallocate: number;
  disk: number;             // в MiB
  disk_overallocate: number;
  servers_count?: number;
  created_at: string;
  updated_at: string;
  status: 'active' | 'maintenance';
}

interface StatusData {
  site: { online: boolean; message: string };
  panel: { online: boolean; message: string };
  nodes: NodeStatus[];
  timestamp: string;
}

export default function Status() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setData(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--blue-3)' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <i className="fas fa-exclamation-triangle" style={{ fontSize: 28, color: '#ef4444', marginBottom: 16 }} />
        <h2>Ошибка загрузки статуса</h2>
        <p>{error || 'Неизвестная ошибка'}</p>
        <button onClick={() => window.location.reload()} className="btn btn-fill" style={{ marginTop: 20 }}>
          Повторить
        </button>
      </div>
    );
  }

  // Преобразование MiB в байты для корректного форматирования
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getLocationName = (id: number | null) => {
    if (!id) return '—';
    const locations: Record<number, string> = {
      1: 'Нидерланды',
      2: 'Германия',
      3: 'Финляндия',
      // добавьте свои ID локаций
    };
    return locations[id] || `Локация #${id}`;
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <h1 className="dash-title">Состояние инфраструктуры</h1>
      <p className="dash-subtitle">Обновлено: {new Date(data.timestamp).toLocaleString('ru-RU')}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 40 }}>
        {/* Статус сайта */}
        <div className="dash-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: data.site.online ? 'rgba(52,211,153,.1)' : 'rgba(239,68,68,.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            color: data.site.online ? '#34d399' : '#ef4444'
          }}>
            <i className={`fas ${data.site.online ? 'fa-check-circle' : 'fa-times-circle'}`} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Сайт Luminarix</h3>
            <p style={{ color: data.site.online ? '#34d399' : '#ef4444', fontWeight: 500 }}>
              {data.site.message}
            </p>
          </div>
        </div>

        {/* Статус панели Pterodactyl */}
        <div className="dash-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: data.panel.online ? 'rgba(52,211,153,.1)' : 'rgba(239,68,68,.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            color: data.panel.online ? '#34d399' : '#ef4444'
          }}>
            <i className={`fas ${data.panel.online ? 'fa-check-circle' : 'fa-times-circle'}`} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Панель Pterodactyl</h3>
            <p style={{ color: data.panel.online ? '#34d399' : '#ef4444', fontWeight: 500 }}>
              {data.panel.message}
            </p>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Ноды Pterodactyl</h2>
      {data.nodes.length === 0 ? (
        <div className="dash-card" style={{ textAlign: 'center', padding: 40 }}>
          <p>Ноды не найдены или недоступны.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {data.nodes.map(node => {
            // Конвертируем MiB в байты для корректного отображения
            const memoryBytes = node.memory * 1024 * 1024;
            const diskBytes = node.disk * 1024 * 1024;

            return (
              <div key={node.id} className="dash-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>{node.name}</h3>
                  <span style={{
                    background: node.status === 'active' ? 'rgba(52,211,153,.1)' : 'rgba(251,191,36,.1)',
                    color: node.status === 'active' ? '#34d399' : '#fbbf24',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    {node.status === 'active' ? 'Активна' : 'Техобслуживание'}
                  </span>
                </div>
                {node.description && <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{node.description}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 2 }}>Серверов</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{node.servers_count ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 2 }}>RAM</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{formatBytes(memoryBytes)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 2 }}>Диск</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{formatBytes(diskBytes)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 2 }}>Локация</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{getLocationName(node.location_id)}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, borderTop: '1px solid var(--border-dim)', paddingTop: 8 }}>
                  ID: {node.id} • Обновлено: {new Date(node.updated_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 30, textAlign: 'center' }}>
        <Link to="/" className="btn btn-ghost">
          <i className="fas fa-arrow-left" /> Вернуться на главную
        </Link>
      </div>
    </div>
  );
}