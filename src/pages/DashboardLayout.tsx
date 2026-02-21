import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useState, useEffect, useRef } from 'react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isStaff = user?.role === 'admin' || user?.role === 'support' || user?.isAdmin;

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="dash-layout">
      <div className="mobile-header">
        <div className="logo" style={{ gap: 8 }}>
          <svg viewBox="0 0 30 30" fill="none" width="24" height="24"><rect width="30" height="30" rx="7" fill="#2563eb"/><path d="M9 21V9l6 4.5L21 9v12l-6-4.5L9 21z" fill="#fff" opacity=".9"/></svg>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-white)' }}>Luminarix</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: 'none', border: 'none', color: 'var(--text-white)', fontSize: 18, cursor: 'pointer', padding: 6 }}
        >
          <i className={`fas ${mobileOpen ? 'fa-times' : 'fa-bars'}`} />
        </button>
      </div>

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/" className="logo" style={{ textDecoration: 'none' }}>
            <svg viewBox="0 0 30 30" fill="none" width="26" height="26"><rect width="30" height="30" rx="7" fill="#2563eb"/><path d="M9 21V9l6 4.5L21 9v12l-6-4.5L9 21z" fill="#fff" opacity=".9"/></svg>
            <span style={{ fontSize: 17 }}>Luminarix</span>
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-label">Основное</div>
          <NavLink to="/dashboard/home" onClick={closeMobile} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-home" /> Главная
          </NavLink>
          <NavLink to="/dashboard/servers" onClick={closeMobile} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-server" /> Мои серверы
          </NavLink>
          <NavLink to="/dashboard/purchase" onClick={closeMobile} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-cart-plus" /> Купить сервер
          </NavLink>

          <div className="sidebar-sep" />
          <div className="sidebar-label">Финансы</div>
          <NavLink to="/dashboard/topup" onClick={closeMobile} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-wallet" /> Пополнить баланс
          </NavLink>

          <div className="sidebar-sep" />
          <div className="sidebar-label">Поддержка</div>
          <NavLink to="/dashboard/tickets" onClick={closeMobile} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-ticket" /> Тикеты
          </NavLink>
          <NavLink to="/dashboard/reviews" onClick={closeMobile} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <i className="fas fa-star" /> Отзывы
          </NavLink>

          {isStaff && (
            <>
              <div className="sidebar-sep" />
              <div className="sidebar-label">Управление</div>
              <NavLink to="/dashboard/admin" onClick={closeMobile} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <i className="fas fa-shield-halved" /> Админ панель
              </NavLink>
            </>
          )}
        </nav>

        {/* Блок профиля внизу (без аватарки) */}
        <div
          className="sidebar-profile"
          ref={profileRef}
          style={{
            padding: '8px 12px',
            borderTop: '1px solid var(--border-dim)',
            position: 'relative',
            marginTop: 'auto',
            background: 'var(--bg-card)'
          }}
        >
          <div
            className="profile-trigger"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}
          >
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.username || 'Гость'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {user?.balance?.toLocaleString()} ₽
              </div>
            </div>
            <i className={`fas fa-chevron-${profileMenuOpen ? 'up' : 'down'}`} style={{ fontSize: 12, color: 'var(--text-dim)' }} />
          </div>

          {profileMenuOpen && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-dim)',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
              zIndex: 100
            }}>
              <NavLink
                to="/dashboard/settings"
                onClick={() => setProfileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  color: 'var(--text-white)',
                  textDecoration: 'none',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <i className="fas fa-gear" style={{ width: 18, color: 'var(--blue-3)' }} />
                Настройки
              </NavLink>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-white)',
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <i className="fas fa-sign-out-alt" style={{ width: 18, color: 'var(--blue-3)' }} />
                Выход
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="dash-content">
        <Outlet />
      </main>

      {mobileOpen && (
        <div onClick={closeMobile} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 40 }} />
      )}
    </div>
  );
}