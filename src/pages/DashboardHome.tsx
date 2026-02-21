import { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { serversApi, GameServer } from '../store';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function DashboardHome() {
  const { user } = useAuth();
  const [servers, setServers] = useState<GameServer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    serversApi.list()
      .then(setServers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeCount = servers.filter(s => s.status === 'active').length;

  const referralLink = `https://luminarix.fun/register?ref=${user?.id}`;
  const referralCount = 0;

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Приветствие (без аватарки) */}
      <motion.div
        variants={itemVariants}
        style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(124,58,237,0.15) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 32,
          padding: '32px 40px',
          marginBottom: 32,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -12px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          zIndex: 0
        }} />
        
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
            color: '#fff',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            Привет, {user?.username || 'гость'}!
          </h2>
          <p style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.7)',
            marginBottom: 4
          }}>
            Добро пожаловать в личный кабинет Luminarix.
          </p>
          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.5)'
          }}>
            Рады видеть вас снова!
          </p>
        </div>
        <div style={{
          position: 'absolute',
          right: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 64,
          opacity: 0.1,
          color: '#fff',
          zIndex: 0
        }}>
          <i className="fas fa-smile-wink" />
        </div>
      </motion.div>

      {/* Блоки статистики */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          marginBottom: 32
        }}
      >
        {[
          {
            icon: 'fa-server',
            bg: 'rgba(37,99,235,0.15)',
            color: '#60a5fa',
            label: 'Активные серверы',
            value: loading ? '...' : activeCount,
            link: '/dashboard/servers'
          },
          {
            icon: 'fa-coins',
            bg: 'rgba(52,211,153,0.15)',
            color: '#34d399',
            label: 'Баланс',
            value: `${user?.balance?.toLocaleString() ?? 0} ₽`,
            link: '/dashboard/topup'
          },
          {
            icon: 'fa-users',
            bg: 'rgba(251,191,36,0.15)',
            color: '#fbbf24',
            label: 'Рефералы',
            value: referralCount,
            extra: (
              <div
                style={{
                  fontSize: 11,
                  color: '#fbbf24',
                  cursor: 'pointer',
                  marginTop: 4
                }}
                onClick={() => navigator.clipboard.writeText(referralLink)}
              >
                <i className="fas fa-copy" style={{ marginRight: 4 }} />
                Копировать ссылку
              </div>
            )
          }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -4, boxShadow: '0 20px 30px -10px rgba(0,0,0,0.5)' }}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-dim)',
              borderRadius: 24,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}
            onClick={() => window.location.href = item.link}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: item.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color: item.color
            }}>
              <i className={`fas ${item.icon}`} />
            </div>
            <div>
              <div style={{
                fontSize: 13,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 4
              }}>
                {item.label}
              </div>
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                lineHeight: 1.2,
                color: '#fff'
              }}>
                {item.value}
              </div>
              {item.extra}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Быстрые действия */}
      <motion.div
        variants={itemVariants}
        style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.05) 0%, rgba(124,58,237,0.05) 100%)',
          border: '1px solid var(--border-dim)',
          borderRadius: 32,
          padding: 28,
          backdropFilter: 'blur(10px)'
        }}
      >
        <h3 style={{
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 20,
          color: '#fff'
        }}>
          Быстрые действия
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16
        }}>
          {[
            { to: '/dashboard/purchase', icon: 'fa-cart-plus', label: 'Купить сервер', color: '#2563eb' },
            { to: '/dashboard/topup', icon: 'fa-coins', label: 'Пополнить баланс', color: '#10b981' },
            { to: '/dashboard/servers', icon: 'fa-server', label: 'Мои серверы', color: '#8b5cf6' },
            { to: '/dashboard/reviews', icon: 'fa-star', label: 'Отзывы', color: '#f59e0b' },
            { to: '/dashboard/tickets', icon: 'fa-headset', label: 'Поддержка', color: '#ef4444' }
          ].map((btn, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                to={btn.to}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: '20px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 24,
                  textDecoration: 'none',
                  color: '#fff',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: `${btn.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: btn.color
                }}>
                  <i className={`fas ${btn.icon}`} />
                </div>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  {btn.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}