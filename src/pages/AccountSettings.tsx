import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { authApi } from '../store';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function AccountSettings() {
  const { user, refreshUser } = useAuth();
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'twofactor'>('profile');

  // Состояния для 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQR, setTwoFactorQR] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorPassword, setTwoFactorPassword] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  useEffect(() => {
    authApi.twoFactorStatus().then(res => {
      setTwoFactorEnabled(res.enabled);
    }).catch(() => {});
  }, []);

  const saveProfile = async () => {
    setMsg(''); setErr('');
    try {
      await authApi.updateProfile({ username: newUsername, email: newEmail });
      await refreshUser();
      setMsg('Профиль успешно обновлён');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка при сохранении');
    }
  };

  const changePassword = async () => {
    setMsg(''); setErr('');
    if (newPassword.length < 6) {
      setErr('Новый пароль должен быть не менее 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr('Пароли не совпадают');
      return;
    }
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMsg('Пароль успешно изменён');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка при смене пароля');
    }
  };

  const enableTwoFactor = async () => {
    setErr(''); setMsg('');
    try {
      const res = await authApi.twoFactorEnable();
      setTwoFactorSecret(res.secret);
      setTwoFactorQR(res.otpauth_url);
      setShowQR(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка при включении 2FA');
    }
  };

  const verifyTwoFactor = async () => {
    if (!twoFactorCode) {
      setErr('Введите код');
      return;
    }
    setErr('');
    try {
      await authApi.twoFactorVerify(twoFactorCode);
      setTwoFactorEnabled(true);
      setShowQR(false);
      setTwoFactorSecret('');
      setTwoFactorCode('');
      setMsg('2FA успешно включена');
      refreshUser();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Неверный код');
    }
  };

  const disableTwoFactor = async () => {
    if (!twoFactorPassword) {
      setErr('Введите пароль');
      return;
    }
    setErr('');
    try {
      await authApi.twoFactorDisable(twoFactorPassword);
      setTwoFactorEnabled(false);
      setTwoFactorPassword('');
      setMsg('2FA отключена');
      refreshUser();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Неверный пароль');
    }
  };

  const copySecretToClipboard = () => {
    navigator.clipboard.writeText(twoFactorSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ maxWidth: 720, margin: '0 auto' }}
    >
      {/* Шапка профиля (без аватарки) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(37,99,235,.12), rgba(99,102,241,.08))',
        border: '1px solid var(--border-light)',
        borderRadius: 24,
        padding: '28px 32px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -40, width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(99,102,241,.1) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{ position: 'relative' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.5px' }}>
            {user?.username || 'Пользователь'}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-gray)', marginBottom: 8 }}>
            {user?.email} · {user?.role === 'admin' ? 'Администратор' : user?.role === 'support' ? 'Поддержка' : 'Пользователь'}
          </p>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-dim)' }}>
            <span><i className="fas fa-calendar-alt" style={{ marginRight: 6, color: 'var(--blue-3)' }} />Регистрация: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '—'}</span>
            <span><i className="fas fa-id-card" style={{ marginRight: 6, color: 'var(--blue-3)' }} />ID: {user?.id ? String(user.id).substring(0, 12) + '…' : '—'}</span>
          </div>
        </div>
      </div>

      {/* Уведомления */}
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '14px 18px', borderRadius: 12, marginBottom: 20,
            background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.2)',
            color: '#34d399', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 10
          }}
        >
          <i className="fas fa-check-circle" style={{ fontSize: 16 }} />
          {msg}
        </motion.div>
      )}
      {err && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '14px 18px', borderRadius: 12, marginBottom: 20,
            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
            color: '#ef4444', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 10
          }}
        >
          <i className="fas fa-exclamation-circle" style={{ fontSize: 16 }} />
          {err}
        </motion.div>
      )}

      {/* Табы */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 20,
        background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
        borderRadius: 14, padding: 5
      }}>
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
            background: activeTab === 'profile' ? 'var(--blue-1)' : 'transparent',
            color: activeTab === 'profile' ? '#fff' : 'var(--text-dim)',
            transition: '.25s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          <i className="fas fa-user-edit" style={{ fontSize: 13 }} />
          Профиль
        </button>
        <button
          onClick={() => setActiveTab('security')}
          style={{
            flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
            background: activeTab === 'security' ? 'var(--blue-1)' : 'transparent',
            color: activeTab === 'security' ? '#fff' : 'var(--text-dim)',
            transition: '.25s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          <i className="fas fa-lock" style={{ fontSize: 13 }} />
          Пароль
        </button>
        <button
          onClick={() => setActiveTab('twofactor')}
          style={{
            flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
            background: activeTab === 'twofactor' ? 'var(--blue-1)' : 'transparent',
            color: activeTab === 'twofactor' ? '#fff' : 'var(--text-dim)',
            transition: '.25s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          <i className="fas fa-shield-alt" style={{ fontSize: 13 }} />
          2FA
        </button>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'profile' && (
          <div className="dash-card" style={{ padding: '28px 32px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-user-circle" style={{ color: 'var(--blue-3)' }} />
              Основная информация
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div className="form-group">
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-gray)' }}>Имя пользователя</label>
                <input
                  className="form-input"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  style={{ padding: '12px 16px', fontSize: 15 }}
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-gray)' }}>Электронная почта</label>
                <input
                  className="form-input"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  style={{ padding: '12px 16px', fontSize: 15 }}
                />
              </div>
            </div>
            <button className="btn btn-fill" onClick={saveProfile} style={{ padding: '12px 28px', fontSize: 15 }}>
              <i className="fas fa-save" style={{ marginRight: 8 }} />
              Сохранить изменения
            </button>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="dash-card" style={{ padding: '28px 32px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-shield-alt" style={{ color: 'var(--blue-3)' }} />
              Смена пароля
            </h3>
            <div style={{ marginBottom: 20 }}>
              <div className="form-group">
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-gray)' }}>Текущий пароль</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  style={{ padding: '12px 16px', fontSize: 15 }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div className="form-group">
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-gray)' }}>Новый пароль</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="минимум 6 символов"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ padding: '12px 16px', fontSize: 15 }}
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-gray)' }}>Подтверждение</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="повторите пароль"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ padding: '12px 16px', fontSize: 15 }}
                />
              </div>
            </div>
            <button className="btn btn-fill" onClick={changePassword} style={{ padding: '12px 28px', fontSize: 15 }}>
              <i className="fas fa-key" style={{ marginRight: 8 }} />
              Обновить пароль
            </button>
          </div>
        )}

        {activeTab === 'twofactor' && (
          <div className="dash-card" style={{ padding: '28px 32px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-shield-alt" style={{ color: 'var(--blue-3)' }} />
              Двухфакторная аутентификация
            </h3>

            {!twoFactorEnabled && !showQR && (
              <div>
                <p style={{ marginBottom: 20, color: 'var(--text-gray)', fontSize: 14 }}>
                  Защитите свой аккаунт с помощью двухфакторной аутентификации. При входе потребуется не только пароль, но и одноразовый код из приложения Google Authenticator.
                </p>
                <button className="btn btn-fill" onClick={enableTwoFactor}>
                  <i className="fas fa-qrcode" style={{ marginRight: 8 }} />
                  Включить 2FA
                </button>
              </div>
            )}

            {showQR && twoFactorSecret && (
              <div>
                <p style={{ marginBottom: 16, color: 'var(--text-gray)', fontSize: 14 }}>
                  Отсканируйте этот QR-код в приложении Google Authenticator.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{
                    padding: 10,
                    backgroundColor: 'white',
                    borderRadius: 12,
                    display: 'inline-block',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}>
                    <QRCodeSVG
                      value={twoFactorQR}
                      size={250}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                </div>
                <div style={{
                  background: 'rgba(0,0,0,0.2)',
                  padding: '14px',
                  borderRadius: 8,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontFamily: 'monospace',
                  fontSize: 16,
                  letterSpacing: '1px',
                  border: '1px solid var(--border-dim)'
                }}>
                  <span>{twoFactorSecret.match(/.{1,4}/g)?.join(' ') || twoFactorSecret}</span>
                  <button
                    onClick={copySecretToClipboard}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--blue-3)',
                      cursor: 'pointer',
                      fontSize: 14,
                      padding: '4px 8px',
                      borderRadius: 6
                    }}
                  >
                    {secretCopied ? <i className="fas fa-check" /> : <i className="fas fa-copy" />}
                  </button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
                  Если сканирование не работает, введите этот ключ вручную в приложении.
                </p>
                <div className="form-group">
                  <label>Код из приложения</label>
                  <input
                    className="form-input"
                    placeholder="6-значный код"
                    value={twoFactorCode}
                    onChange={e => setTwoFactorCode(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-fill" onClick={verifyTwoFactor}>
                    <i className="fas fa-check" style={{ marginRight: 8 }} />
                    Подтвердить и включить
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowQR(false)}>
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {twoFactorEnabled && (
              <div>
                <div style={{ background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.2)', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <i className="fas fa-check-circle" style={{ color: '#34d399', fontSize: 24 }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>2FA включена</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Ваш аккаунт защищён двухфакторной аутентификацией.</div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Введите пароль для отключения</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="••••••••"
                    value={twoFactorPassword}
                    onChange={e => setTwoFactorPassword(e.target.value)}
                  />
                </div>
                <button className="btn btn-ghost" onClick={disableTwoFactor} style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,.3)' }}>
                  <i className="fas fa-times" style={{ marginRight: 8 }} />
                  Отключить 2FA
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Блок с информацией об аккаунте */}
      <div className="dash-card" style={{ marginTop: 20, padding: '24px 28px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-chart-pie" style={{ color: 'var(--blue-3)' }} />
          Статистика аккаунта
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div style={{
            padding: '16px', borderRadius: 12,
            background: 'rgba(255,255,255,.02)', border: '1px solid var(--border-dim)',
            textAlign: 'center'
          }}>
            <i className="fas fa-coins" style={{ fontSize: 22, color: 'var(--blue-3)', marginBottom: 6 }} />
            <div style={{ fontSize: 20, fontWeight: 700 }}>{user?.balance?.toLocaleString()}₽</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Баланс</div>
          </div>
          <div style={{
            padding: '16px', borderRadius: 12,
            background: 'rgba(255,255,255,.02)', border: '1px solid var(--border-dim)',
            textAlign: 'center'
          }}>
            <i className="fas fa-tag" style={{ fontSize: 22, color: 'var(--blue-3)', marginBottom: 6 }} />
            <div style={{ fontSize: 20, fontWeight: 700 }}>{user?.role === 'admin' ? 'Админ' : user?.role === 'support' ? 'Саппорт' : 'Юзер'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Роль</div>
          </div>
          <div style={{
            padding: '16px', borderRadius: 12,
            background: 'rgba(255,255,255,.02)', border: '1px solid var(--border-dim)',
            textAlign: 'center'
          }}>
            <i className="fas fa-calendar-check" style={{ fontSize: 22, color: 'var(--blue-3)', marginBottom: 6 }} />
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '-'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Регистрация</div>
          </div>
          <div style={{
            padding: '16px', borderRadius: 12,
            background: 'rgba(255,255,255,.02)', border: '1px solid var(--border-dim)',
            textAlign: 'center'
          }}>
            <i className="fas fa-fingerprint" style={{ fontSize: 22, color: 'var(--blue-3)', marginBottom: 6 }} />
            <div style={{ fontSize: 16, fontWeight: 700, wordBreak: 'break-word' }}>
              {user?.id ? String(user.id).substring(0, 8) + '…' : '-'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>ID</div>
          </div>
        </div>
      </div>

      {/* Примечание о безопасности */}
      <div style={{
        marginTop: 20,
        padding: '14px 20px',
        borderRadius: 12,
        background: 'rgba(59,130,246,.04)',
        border: '1px solid var(--border-dim)',
        display: 'flex',
        alignItems: 'center',
        gap: 14
      }}>
        <i className="fas fa-shield-alt" style={{ fontSize: 22, color: 'var(--blue-3)' }} />
        <p style={{ fontSize: 13, color: 'var(--text-gray)', margin: 0, lineHeight: 1.5 }}>
          Для дополнительной защиты рекомендуется использовать сложный пароль и двухфакторную аутентификацию. В случае подозрительной активности обратитесь в поддержку.
        </p>
      </div>
    </motion.div>
  );
}