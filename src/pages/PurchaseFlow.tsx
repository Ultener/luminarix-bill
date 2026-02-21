import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { Tariff, GAME_CORES, plansApi, serversApi, pteroApi } from '../store';

const STEPS = ['Основное', 'Софт', 'Тариф', 'Оплата'];

const LOCATIONS = [
  { id: 'netherlands', name: 'Нидерланды', available: true },
  { id: 'germany', name: 'Германия (скоро)', available: false },
];

export default function PurchasePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Основное
  const [step, setStep] = useState(0);
  const [serverName, setServerName] = useState('');
  const [months, setMonths] = useState(1);
  const [location, setLocation] = useState('netherlands'); // id выбранной локации

  // Софт
  const [selectedCore, setSelectedCore] = useState('');

  // Тариф
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);

  // Оплата / создание
  const [paying, setPaying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [provisionStatus, setProvisionStatus] = useState('');

  // Промокод (заглушка)
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  // Проверка Pterodactyl
  const [pteroAvailable, setPteroAvailable] = useState<boolean | null>(null);
  const [pteroChecking, setPteroChecking] = useState(true);

  // Итоговая цена
  const totalPrice = selectedTariff ? selectedTariff.price * months : 0;

  useEffect(() => {
    plansApi.list().then(setTariffs).catch(() => {});
    checkPtero();
  }, []);

  const checkPtero = async () => {
    setPteroChecking(true);
    try {
      const r = await pteroApi.test();
      setPteroAvailable(r.success === true);
    } catch {
      setPteroAvailable(false);
    } finally {
      setPteroChecking(false);
    }
  };

  const canNext = () => {
    if (step === 0) return serverName.trim().length >= 2;
    if (step === 1) return !!selectedCore;
    if (step === 2) return !!selectedTariff;
    return true;
  };

  const next = () => {
    setError('');
    if (canNext()) setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const prev = () => {
    setError('');
    setStep(s => Math.max(s - 1, 0));
  };

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    if (promoCode.toUpperCase() === 'OK') {
      alert('Промокод активирован: +100 баллов!');
      setPromoApplied(true);
    } else {
      alert('Неверный промокод');
    }
    setPromoCode('');
  };

  const handlePay = async () => {
    if (!user || !selectedTariff) return;
    if ((user.balance ?? 0) < totalPrice) {
      setError('Недостаточно средств. Пополните баланс.');
      return;
    }

    setPaying(true);
    setError('');
    setProvisionStatus('Проверка системы...');

    try {
      const testResult = await pteroApi.test();
      if (!testResult.success) {
        setError('Система создания серверов временно недоступна');
        setPaying(false);
        setProvisionStatus('');
        return;
      }
    } catch (err) {
      setError('Не удалось подключиться к серверу');
      setPaying(false);
      setProvisionStatus('');
      return;
    }

    setProvisionStatus('Создание сервера в Pterodactyl...');
    const coreName = GAME_CORES.find(c => c.id === selectedCore)?.name || selectedCore;

    try {
      const provisionPayload = {
        email: user.email,
        username: user.username,
        serverName,
        ram: selectedTariff.ram,
        disk: selectedTariff.disk,
        cpu: selectedTariff.cores,
        core: coreName,
      };
      const result = await pteroApi.provision(provisionPayload);

      if (!result.success || !result.server) {
        throw new Error(result.error || 'Ошибка создания сервера');
      }

      setProvisionStatus('Сохранение в базе данных...');

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);

      const serverPayload = {
        name: serverName,
        tariffId: selectedTariff.id,
        tariffName: selectedTariff.name,
        tariffTier: selectedTariff.tier,
        coreName,
        ram: selectedTariff.ram,
        cores: selectedTariff.cores,
        disk: selectedTariff.disk,
        price: selectedTariff.price,
        months,
        expiresAt: expiresAt.toISOString(),
        ip: result.server.ip,
        port: result.server.port,
        node: result.server.node,
        pterodactylServerId: result.server.id,
        pterodactylIdentifier: result.server.identifier,
        pterodactylUuid: result.server.uuid,
      };

      const response = await serversApi.create(serverPayload);
      await refreshUser();

      setPaying(false);
      setShowSuccess(true);
      setTimeout(() => navigate(`/dashboard/server/${response.server.id}`), 2500);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setPaying(false);
      setProvisionStatus('');
    }
  };

  if (showSuccess) {
    return (
      <AnimatePresence>
        <motion.div className="payment-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="payment-check"
          >
            <i className="fas fa-check" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="payment-text"
          >
            Оплата прошла успешно!
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="payment-sub"
          >
            Сервер создан. Перенаправляем...
          </motion.div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 200 }}
            transition={{ duration: 2, delay: 0.5 }}
            style={{ height: 3, background: 'linear-gradient(90deg, var(--blue-1), var(--cyan))', borderRadius: 2 }}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (pteroChecking) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 className="dash-title">Новый сервер</h1>
        <div className="dash-card" style={{ textAlign: 'center', padding: '60px 28px' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--blue-3)', marginBottom: 16 }} />
          <h3>Проверка системы...</h3>
        </div>
      </div>
    );
  }

  if (pteroAvailable === false) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 className="dash-title">Новый сервер</h1>
        <div className="dash-card" style={{ textAlign: 'center', padding: '60px 28px' }}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: 44, color: '#ef4444', marginBottom: 16 }} />
          <h3 style={{ color: '#f87171', marginBottom: 8 }}>Создание серверов недоступно</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 24 }}>
            Попробуйте позже или обратитесь в поддержку.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-fill" onClick={checkPtero}>
              <i className="fas fa-redo" /> Повторить
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/dashboard/servers')}>
              <i className="fas fa-arrow-left" /> Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h1 className="dash-title" style={{ marginBottom: 4 }}>Новый сервер</h1>
      <p className="dash-subtitle" style={{ marginBottom: 24 }}>4 шага до запуска</p>

      {/* Вкладки шагов (визуальные, без возможности переключения) */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: 'var(--bg-card)', borderRadius: 10, padding: 4 }}>
        {STEPS.map((label, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 8,
              background: i === step ? 'var(--blue-1)' : 'transparent',
              color: i === step ? '#fff' : 'var(--text-dim)',
              fontWeight: 600,
              fontSize: 14,
              textAlign: 'center',
              cursor: 'default', // не кликабельно
            }}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 20,
          background: 'rgba(239,68,68,.1)',
          border: '1px solid rgba(239,68,68,.2)',
          color: '#f87171',
          fontSize: 13,
          fontWeight: 600,
        }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* Левая часть — содержимое шага */}
        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              {/* Шаг 0: Основное */}
              {step === 0 && (
                <div className="dash-card">
                  <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Основное</h3>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label>Название</label>
                    <input
                      className="form-input"
                      placeholder="Имя вашего сервера"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label>Срок</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {[1, 3, 6, 12].map((m) => (
                        <button
                          key={m}
                          onClick={() => setMonths(m)}
                          style={{
                            padding: '10px 0',
                            borderRadius: 8,
                            border: `2px solid ${months === m ? 'var(--blue-1)' : 'var(--border-dim)'}`,
                            background: months === m ? 'rgba(37,99,235,.08)' : 'transparent',
                            color: months === m ? 'var(--text-white)' : 'var(--text-dim)',
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer',
                          }}
                        >
                          {m} мес.
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Локация</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                      {LOCATIONS.map((loc) => (
                        <button
                          key={loc.id}
                          onClick={() => loc.available && setLocation(loc.id)}
                          disabled={!loc.available}
                          style={{
                            padding: '10px 0',
                            borderRadius: 8,
                            border: `2px solid ${location === loc.id ? 'var(--blue-1)' : 'var(--border-dim)'}`,
                            background: location === loc.id ? 'rgba(37,99,235,.08)' : 'transparent',
                            color: !loc.available ? 'var(--text-dim)' : (location === loc.id ? 'var(--text-white)' : 'var(--text-dim)'),
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: loc.available ? 'pointer' : 'not-allowed',
                            opacity: !loc.available ? 0.5 : 1,
                          }}
                        >
                          {loc.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Шаг 1: Софт (выбор ядра) */}
              {step === 1 && (
                <div className="dash-card">
                  <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Софт</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {GAME_CORES.map((core) => (
                      <div
                        key={core.id}
                        onClick={() => setSelectedCore(core.id)}
                        style={{
                          padding: '16px 12px',
                          borderRadius: 12,
                          border: `2px solid ${selectedCore === core.id ? 'var(--blue-1)' : 'var(--border-dim)'}`,
                          background: selectedCore === core.id ? 'rgba(37,99,235,.08)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 6 }}>
                          <i className={`fas ${core.icon}`} style={{ color: 'var(--blue-3)' }} />
                        </div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{core.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{core.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Шаг 2: Тариф */}
              {step === 2 && (
                <div className="dash-card">
                  <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Тариф</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {tariffs.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTariff(t)}
                        style={{
                          padding: '16px',
                          borderRadius: 12,
                          border: `2px solid ${selectedTariff?.id === t.id ? 'var(--blue-1)' : 'var(--border-dim)'}`,
                          background: selectedTariff?.id === t.id ? 'rgba(37,99,235,.08)' : 'var(--bg-card)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 16 }}>{t.tier} {t.name}</span>
                          {t.popular && (
                            <span style={{ background: 'var(--blue-1)', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 12 }}>
                              POPULAR
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{t.price}₽/мес</div>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-dim)' }}>
                          {t.features.slice(0, 3).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Шаг 3: Оплата */}
              {step === 3 && (
                <div className="dash-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
                  <i className="fas fa-credit-card" style={{ fontSize: 40, color: 'var(--blue-3)', marginBottom: 16 }} />
                  <h3 style={{ fontSize: 20, marginBottom: 8 }}>Подтверждение оплаты</h3>
                  <p style={{ color: 'var(--text-gray)', marginBottom: 16, fontSize: 14 }}>
                    Со счёта будет списано <strong style={{ color: 'var(--text-white)' }}>{totalPrice}₽</strong>
                  </p>
                  <div style={{ marginBottom: 16, fontSize: 14 }}>
                    <span style={{ color: 'var(--text-dim)' }}>Баланс: </span>
                    <span style={{ fontWeight: 700, color: (user?.balance ?? 0) >= totalPrice ? '#34d399' : '#ef4444' }}>
                      {user?.balance?.toLocaleString()}₽
                    </span>
                  </div>

                  {paying && provisionStatus && (
                    <div style={{ marginBottom: 20, padding: '10px', background: 'rgba(37,99,235,.06)', borderRadius: 8, fontSize: 13 }}>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />
                      {provisionStatus}
                    </div>
                  )}

                  <button
                    className="btn btn-fill"
                    onClick={handlePay}
                    disabled={paying || (user?.balance ?? 0) < totalPrice}
                    style={{ width: '100%', padding: '14px', fontSize: 16 }}
                  >
                    {paying ? (
                      <><i className="fas fa-spinner fa-spin" /> Создаём...</>
                    ) : (user?.balance ?? 0) < totalPrice ? (
                      'Недостаточно средств'
                    ) : (
                      <><i className="fas fa-lock" /> Оплатить {totalPrice}₽</>
                    )}
                  </button>

                  {(user?.balance ?? 0) < totalPrice && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => navigate('/dashboard/topup')}
                      style={{ marginTop: 12, fontSize: 13 }}
                    >
                      <i className="fas fa-wallet" /> Пополнить
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Правая колонка — заказ */}
        <div className="dash-card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Заказ</h3>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-dim)' }}>Тариф</span>
              <span style={{ fontWeight: 600 }}>
                {selectedTariff ? `${selectedTariff.tier} ${selectedTariff.name}` : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-dim)' }}>Первоначальный период</span>
              <span style={{ fontWeight: 600 }}>{months} мес.</span>
            </div>
          </div>

          {/* Промокод */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-gray)', marginBottom: 6, display: 'block' }}>
              Промокод
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Код"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-ghost" onClick={handleApplyPromo} style={{ padding: '0 12px' }}>
                Применить
              </button>
            </div>
            {promoApplied && (
              <p style={{ fontSize: 11, color: '#34d399', marginTop: 6 }}>Промокод активирован! +100 баллов</p>
            )}
          </div>

          {/* Итого */}
          <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
              <span>Итого</span>
              <span style={{ color: 'var(--blue-3)' }}>{totalPrice}₽</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
              <span>Баллы</span>
              <span>35 ₽</span>
            </div>
          </div>
        </div>
      </div>

      {/* Кнопки навигации */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button className="btn btn-ghost" onClick={prev} disabled={step === 0}>
          <i className="fas fa-arrow-left" style={{ marginRight: 6 }} />
          Назад
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn btn-fill" onClick={next} disabled={!canNext()}>
            Далее
            <i className="fas fa-arrow-right" style={{ marginLeft: 6 }} />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}