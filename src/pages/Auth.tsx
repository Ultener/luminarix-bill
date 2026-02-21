import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import { authApi } from '../store';
import ReCAPTCHA from 'react-google-recaptcha';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset' | 'verify';

// Функция валидации имени пользователя
const validateUsername = (username: string): boolean => {
  if (username.length < 3 || username.length > 30) return false;
  const regex = /^[a-zA-Zа-яА-Я0-9_.-]+$/;
  return regex.test(username);
};

// Функция проверки сложности пароля
const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Пароль должен содержать минимум 8 символов' };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: 'Пароль должен содержать хотя бы одну букву' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Пароль должен содержать хотя бы одну цифру' };
  }
  return { valid: true, message: '' };
};

export default function Auth({ mode }: { mode: AuthMode }) {
  const { user, setUser, setToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [regStep, setRegStep] = useState(0);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [loginRecaptchaToken, setLoginRecaptchaToken] = useState('');
  const [regRecaptchaToken, setRegRecaptchaToken] = useState('');

  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  if (user) return <Navigate to="/dashboard" />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }
    if (!loginRecaptchaToken) {
      setError('Пожалуйста, подтвердите, что вы не робот');
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.login(email, password, loginRecaptchaToken);
      if (data.require2FA) {
        setTwoFactorStep(true);
        setTempToken(data.tempToken);
      } else {
        setToken(data.token);
        setUser(data.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.twoFactorVerifyLogin(tempToken, twoFactorCode);
      setToken(data.token);
      setUser(data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Проверка сложности пароля
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      setError(passwordCheck.message);
      return;
    }

    if (password !== confirmPw) {
      setError('Пароли не совпадают');
      return;
    }
    if (!regRecaptchaToken) {
      setError('Пожалуйста, подтвердите, что вы не робот');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register(username, email, password, regRecaptchaToken);
      setMessage(res.message || 'Регистрация успешна. Проверьте почту для подтверждения.');
      setRegisteredEmail(email);
      setRegStep(3);
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verify(registeredEmail || email, verificationCode);
      setMessage(res.message || 'Email подтверждён. Теперь вы можете войти.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Неверный код');
    }
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Введите email');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.forgot(email);
      setMessage(res.message || 'Код отправлен на почту');
      setTimeout(() => navigate(`/reset?email=${encodeURIComponent(email)}`), 1500);
    } catch (err: any) {
      setError(err.message || 'Ошибка');
    }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !resetCode || !newPassword) {
      setError('Заполните все поля');
      return;
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      setError(passwordCheck.message);
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.reset(email, resetCode, newPassword);
      setMessage(res.message || 'Пароль изменён. Теперь вы можете войти.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Ошибка');
    }
    setLoading(false);
  };

  const nextRegStep = () => {
    setError('');
    if (regStep === 0) {
      if (!username.trim() || username.trim().length < 3) {
        setError('Имя минимум 3 символа');
        return;
      }
      if (!validateUsername(username)) {
        setError('Имя может содержать только буквы, цифры, _, ., -');
        return;
      }
      if (!regRecaptchaToken) {
        setError('Пожалуйста, подтвердите, что вы не робот');
        return;
      }
      setRegStep(1);
    } else if (regStep === 1) {
      if (!email.trim() || !email.includes('@')) {
        setError('Введите корректный email');
        return;
      }
      setRegStep(2);
    }
  };

  const renderContent = () => {
    if (twoFactorStep) {
      return (
        <form onSubmit={handleTwoFactorVerify}>
          <div className="form-group">
            <label>
              <i className="fas fa-key" style={{ marginRight: 6, fontSize: 11 }} />
              Код из Google Authenticator
            </label>
            <input
              className="form-input"
              placeholder="6-значный код"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="btn btn-fill"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '14px 28px' }}
          >
            {loading ? <><i className="fas fa-spinner fa-spin" /> Проверка...</> : <><i className="fas fa-check" /> Подтвердить</>}
          </button>
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setTwoFactorStep(false);
                setTempToken('');
                setTwoFactorCode('');
              }}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <i className="fas fa-arrow-left" /> Назад
            </button>
          </div>
        </form>
      );
    }

    if (mode === 'register') {
      if (regStep === 3) {
        return (
          <>
            <div className="form-group">
              <label>
                <i className="fas fa-envelope" style={{ marginRight: 6, fontSize: 11 }} />
                Код из письма
              </label>
              <input
                className="form-input"
                placeholder="6-значный код"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={handleVerify}
              className="btn btn-fill"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '14px 28px' }}
            >
              {loading ? <><i className="fas fa-spinner fa-spin" /> Проверка...</> : <><i className="fas fa-check" /> Подтвердить</>}
            </button>
            <div style={{ marginTop: 12 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setRegStep(2)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <i className="fas fa-arrow-left" /> Назад
              </button>
            </div>
          </>
        );
      }
      if (regStep === 0) {
        return (
          <>
            <div className="form-group">
              <label>
                <i className="fas fa-user" style={{ marginRight: 6, fontSize: 11 }} />
                Имя пользователя
              </label>
              <input
                className="form-input"
                placeholder="Ваш никнейм"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                Только буквы, цифры, _, ., -
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''}
                onChange={(token) => setRegRecaptchaToken(token || '')}
                theme="dark"
              />
            </div>
            <button
              type="button"
              onClick={nextRegStep}
              disabled={!regRecaptchaToken}
              className="btn btn-fill"
              style={{ width: '100%', justifyContent: 'center', padding: '14px 28px', opacity: !regRecaptchaToken ? 0.7 : 1 }}
            >
              Далее <i className="fas fa-arrow-right" />
            </button>
          </>
        );
      }
      if (regStep === 1) {
        return (
          <>
            <div className="form-group">
              <label>
                <i className="fas fa-envelope" style={{ marginRight: 6, fontSize: 11 }} />
                Электронная почта
              </label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setError(''); setRegStep(0); }}
                className="btn btn-ghost"
                style={{ flex: 1, justifyContent: 'center', padding: '14px 20px' }}
              >
                <i className="fas fa-arrow-left" /> Назад
              </button>
              <button
                type="button"
                onClick={nextRegStep}
                className="btn btn-fill"
                style={{ flex: 2, justifyContent: 'center', padding: '14px 20px' }}
              >
                Далее <i className="fas fa-arrow-right" />
              </button>
            </div>
          </>
        );
      }
      if (regStep === 2) {
        return (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>
                <i className="fas fa-lock" style={{ marginRight: 6, fontSize: 11 }} />
                Пароль
              </label>
              <input
                className="form-input"
                type="password"
                placeholder="Минимум 8 символов, буквы и цифры"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                Пароль должен содержать минимум 8 символов, хотя бы одну букву и одну цифру
              </div>
            </div>
            <div className="form-group">
              <label>
                <i className="fas fa-check-double" style={{ marginRight: 6, fontSize: 11 }} />
                Повторите пароль
              </label>
              <input
                className="form-input"
                type="password"
                placeholder="Ещё раз..."
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setError(''); setRegStep(1); }}
                className="btn btn-ghost"
                style={{ flex: 1, justifyContent: 'center', padding: '14px 20px' }}
              >
                <i className="fas fa-arrow-left" /> Назад
              </button>
              <button
                type="submit"
                className="btn btn-fill"
                disabled={loading}
                style={{ flex: 2, justifyContent: 'center', padding: '14px 20px', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? <><i className="fas fa-spinner fa-spin" /></> : <><i className="fas fa-user-plus" /> Создать</>}
              </button>
            </div>
          </form>
        );
      }
    }

    if (mode === 'login') {
      return (
        <>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>
                <i className="fas fa-envelope" style={{ marginRight: 6, fontSize: 11 }} />
                Электронная почта
              </label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>
                <i className="fas fa-lock" style={{ marginRight: 6, fontSize: 11 }} />
                Пароль
              </label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''}
                onChange={(token) => setLoginRecaptchaToken(token || '')}
                theme="dark"
              />
            </div>
            <button
              type="submit"
              className="btn btn-fill"
              disabled={loading || !loginRecaptchaToken}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '14px 28px', opacity: loading || !loginRecaptchaToken ? 0.7 : 1 }}
            >
              {loading ? <><i className="fas fa-spinner fa-spin" /> Входим...</> : <><i className="fas fa-arrow-right" /> Войти</>}
            </button>
          </form>
          {/* Кнопка входа через Discord */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <a href="/api/auth/discord" className="btn btn-discord" style={{
              background: '#5865F2',
              color: 'white',
              padding: '12px 24px',
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              justifyContent: 'center'
            }}>
              <i className="fab fa-discord" /> Войти через Discord
            </a>
          </div>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/forgot" style={{ color: 'var(--blue-3)', fontSize: 13 }}>Забыли пароль?</Link>
          </div>
        </>
      );
    }

    if (mode === 'forgot') {
      return (
        <>
          <form onSubmit={handleForgot}>
            <div className="form-group">
              <label>
                <i className="fas fa-envelope" style={{ marginRight: 6, fontSize: 11 }} />
                Электронная почта
              </label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="btn btn-fill"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '14px 28px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? <><i className="fas fa-spinner fa-spin" /> Отправка...</> : <><i className="fas fa-paper-plane" /> Отправить код</>}
            </button>
          </form>
          <div style={{ marginTop: 12 }}>
            <Link to="/login" className="btn btn-ghost" style={{ display: 'block', textAlign: 'center' }}>
              <i className="fas fa-arrow-left" /> Вернуться ко входу
            </Link>
          </div>
        </>
      );
    }

    if (mode === 'reset') {
      return (
        <>
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label>
                <i className="fas fa-envelope" style={{ marginRight: 6, fontSize: 11 }} />
                Электронная почта
              </label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>
                <i className="fas fa-key" style={{ marginRight: 6, fontSize: 11 }} />
                Код из письма
              </label>
              <input
                className="form-input"
                placeholder="6-значный код"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>
                <i className="fas fa-lock" style={{ marginRight: 6, fontSize: 11 }} />
                Новый пароль
              </label>
              <input
                className="form-input"
                type="password"
                placeholder="Минимум 8 символов, буквы и цифры"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                Пароль должен содержать минимум 8 символов, хотя бы одну букву и одну цифру
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-fill"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '14px 28px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? <><i className="fas fa-spinner fa-spin" /> Сохраняем...</> : <><i className="fas fa-save" /> Сменить пароль</>}
            </button>
          </form>
          <div style={{ marginTop: 12 }}>
            <Link to="/login" className="btn btn-ghost" style={{ display: 'block', textAlign: 'center' }}>
              <i className="fas fa-arrow-left" /> Вернуться ко входу
            </Link>
          </div>
        </>
      );
    }

    if (mode === 'verify') {
      return (
        <>
          <div className="form-group">
            <label>
              <i className="fas fa-envelope" style={{ marginRight: 6, fontSize: 11 }} />
              Электронная почта
            </label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>
              <i className="fas fa-key" style={{ marginRight: 6, fontSize: 11 }} />
              Код из письма
            </label>
            <input
              className="form-input"
              placeholder="6-значный код"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={handleVerify}
            className="btn btn-fill"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '14px 28px' }}
          >
            {loading ? <><i className="fas fa-spinner fa-spin" /> Проверка...</> : <><i className="fas fa-check" /> Подтвердить</>}
          </button>
          <div style={{ marginTop: 12 }}>
            <Link to="/login" className="btn btn-ghost" style={{ display: 'block', textAlign: 'center' }}>
              <i className="fas fa-arrow-left" /> Вернуться ко входу
            </Link>
          </div>
        </>
      );
    }

    return null;
  };

  let title = '';
  let subtitle = '';
  if (mode === 'login') {
    title = 'Вход в аккаунт';
    subtitle = 'Введите данные для входа';
  } else if (mode === 'register') {
    if (regStep === 3) {
      title = 'Подтверждение email';
      subtitle = 'Введите код из письма';
    } else {
      title = 'Регистрация';
      subtitle = `Шаг ${regStep + 1} из 3`;
    }
  } else if (mode === 'forgot') {
    title = 'Восстановление пароля';
    subtitle = 'Введите email для получения кода';
  } else if (mode === 'reset') {
    title = 'Сброс пароля';
    subtitle = 'Введите код и новый пароль';
  } else if (mode === 'verify') {
    title = 'Подтверждение email';
    subtitle = 'Введите код из письма';
  }

  return (
    <div className="auth-page">
      <div className="amb amb-1" /><div className="amb amb-2" />
      <div className="auth-wrapper">
        <div className="auth-side">
          <div className="auth-side-icon"><i className="fas fa-sign-in-alt" /></div>
          <h2>Добро пожаловать!</h2>
          <p>Управляйте серверами с Luminarix</p>
          <div className="auth-features">
            <div className="auth-feat"><i className="fas fa-server" /> Управление серверами</div>
            <div className="auth-feat"><i className="fas fa-shield-halved" /> DDoS защита</div>
            <div className="auth-feat"><i className="fas fa-headset" /> Быстрая поддержка</div>
            <div className="auth-feat"><i className="fas fa-chart-line" /> Мониторинг 24/7</div>
          </div>
        </div>
        <div className="auth-form-side">
          <Link to="/" className="logo" style={{ marginBottom: 28, display: 'inline-flex' }}>
            <svg viewBox="0 0 30 30" fill="none"><rect width="30" height="30" rx="7" fill="#2563eb"/><path d="M9 21V9l6 4.5L21 9v12l-6-4.5L9 21z" fill="#fff" opacity=".9"/></svg>
            <span>Luminarix</span>
          </Link>
          <h1>{title}</h1>
          <p className="sub">{subtitle}</p>
          {message && (
            <div className="form-success" style={{ background: 'rgba(52,211,153,.1)', borderColor: 'rgba(52,211,153,.2)', color: '#34d399', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>
              <i className="fas fa-check-circle" style={{ marginRight: 8 }} />
              {message}
            </div>
          )}
          {error && (
            <div className="form-error">
              <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />
              {error}
            </div>
          )}
          {renderContent()}
          {mode === 'register' && regStep < 3 && (
            <div className="auth-link">
              Уже есть аккаунт? <Link to="/login">Войти</Link>
            </div>
          )}
          {mode === 'login' && (
            <div className="auth-link">
              Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}