import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { motion } from 'framer-motion';
import { transactionsApi, Transaction } from '../store';

const PRESETS = [100, 250, 500, 1000, 2500, 5000];
const YOOMONEY_WALLET = '410016955130585';

export default function TopUp() {
  const { user } = useAuth();
  const [amount, setAmount] = useState(250);
  const [custom, setCustom] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'yoomoney' | 'sbp' | 'card'>('yoomoney');

  const finalAmount = custom ? parseInt(custom) || 0 : amount;

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoadingHistory(true);
    try {
      const data = await transactionsApi.list();
      setTransactions(data);
    } catch (e) {
      console.error('Failed to load transactions', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleYooMoneyPay = () => {
    if (finalAmount <= 0) return;
    setIsLoading(true);
    const label = `lmx_${user?.id}_${Date.now()}`;
    window.open(
      `https://yoomoney.ru/quickpay/confirm.xml?receiver=${YOOMONEY_WALLET}&quickpay-form=button&paymentType=AC&sum=${finalAmount}&label=${label}&successURL=${window.location.origin}/dashboard/topup`,
      '_blank'
    );
    setTimeout(() => setIsLoading(false), 3000);
  };

  const handleSbpPay = () => {
    alert('Оплата через СБП временно недоступна. Ведутся технические работы.');
  };

  const handleCardPay = () => {
    alert('Оплата банковскими картами РФ временно недоступна. Воспользуйтесь платежной системой YooMoney.');
  };

  const getPayHandler = () => {
    switch (paymentMethod) {
      case 'yoomoney': return handleYooMoneyPay;
      case 'sbp': return handleSbpPay;
      case 'card': return handleCardPay;
    }
  };

  const getPayButtonText = () => {
    switch (paymentMethod) {
      case 'yoomoney': return 'Оплатить через YooMoney';
      case 'sbp': return 'Оплатить через СБП';
      case 'card': return 'Оплатить картой РФ';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleActivatePromo = () => {
    if (!promoCode.trim()) return;
    alert('Промокод не найден. Попробуйте другой!');
    setPromoCode('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ maxWidth: 1200, margin: '0 auto' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="dash-title">Пополнение баланса</h1>
          <p className="dash-subtitle" style={{ marginBottom: 0 }}>Мгновенное пополнение</p>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, var(--blue-1), #7c3aed)',
          padding: '12px 24px',
          borderRadius: 16,
          color: '#fff',
          fontWeight: 700,
          fontSize: 24,
          boxShadow: '0 8px 20px rgba(37,99,235,0.3)'
        }}>
          {user?.balance?.toLocaleString()}₽
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Левая колонка — форма пополнения */}
        <div className="dash-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-coins" style={{ color: 'var(--blue-3)' }} />
            Выберите сумму
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {PRESETS.map(p => (
              <motion.button
                key={p}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setAmount(p); setCustom(''); }}
                style={{
                  padding: '16px 8px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  fontSize: 18,
                  border: `2px solid ${!custom && amount === p ? 'var(--blue-1)' : 'var(--border-dim)'}`,
                  background: !custom && amount === p ? 'rgba(37,99,235,.08)' : 'var(--bg-card)',
                  color: !custom && amount === p ? 'var(--text-white)' : 'var(--text-dim)',
                  boxShadow: !custom && amount === p ? '0 4px 12px rgba(37,99,235,0.2)' : 'none',
                }}
              >
                {p}₽
              </motion.button>
            ))}
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label>Своя сумма (₽)</label>
            <input
              className="form-input"
              type="number"
              placeholder="От 1 до 100 000"
              min="1"
              max="100000"
              value={custom}
              onChange={e => setCustom(e.target.value)}
            />
            {custom && parseInt(custom) > 100000 && (
              <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>
                Максимальная сумма — 100 000₽
              </p>
            )}
          </div>

          {/* Переключатель способов оплаты с логотипами */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {/* Кнопка ЮMoney */}
            <button
              onClick={() => setPaymentMethod('yoomoney')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 10,
                border: `2px solid ${paymentMethod === 'yoomoney' ? 'var(--blue-1)' : 'var(--border-dim)'}`,
                background: paymentMethod === 'yoomoney' ? 'rgba(37,99,235,.08)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: '.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <img 
                src="/assets/img/payments/yoomoney-logo.svg" 
                alt="YooMoney"
                style={{ 
                  height: '24px', 
                  width: 'auto',
                  objectFit: 'contain',
                  filter: paymentMethod !== 'yoomoney' ? 'grayscale(1)' : 'none',
                  opacity: paymentMethod !== 'yoomoney' ? 0.7 : 1,
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600 }}>YooMoney</span>
            </button>

            {/* Кнопка СБП */}
            <button
              onClick={() => setPaymentMethod('sbp')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 10,
                border: `2px solid ${paymentMethod === 'sbp' ? 'var(--blue-1)' : 'var(--border-dim)'}`,
                background: paymentMethod === 'sbp' ? 'rgba(37,99,235,.08)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: '.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <img 
                src="/assets/img/payments/sbp-logo.svg" 
                alt="СБП"
                style={{ 
                  height: '24px', 
                  width: 'auto',
                  objectFit: 'contain',
                  filter: paymentMethod !== 'sbp' ? 'grayscale(1)' : 'none',
                  opacity: paymentMethod !== 'sbp' ? 0.7 : 1,
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600 }}>СБП</span>
            </button>

            {/* Кнопка Карты РФ (оставим иконку, так как единого логотипа нет) */}
            <button
              onClick={() => setPaymentMethod('card')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 10,
                border: `2px solid ${paymentMethod === 'card' ? 'var(--blue-1)' : 'var(--border-dim)'}`,
                background: paymentMethod === 'card' ? 'rgba(37,99,235,.08)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: '.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <i className="fas fa-credit-card" style={{ fontSize: 24, color: 'var(--blue-3)' }} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Карты РФ</span>
            </button>
          </div>

          {/* Блок с суммой к оплате */}
          <div style={{
            padding: '16px 20px',
            borderRadius: 12,
            background: 'rgba(52,211,153,.04)',
            border: '1px solid rgba(52,211,153,.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24
          }}>
            <span style={{ color: 'var(--text-gray)', fontSize: 15 }}>К оплате:</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#34d399' }}>{finalAmount}₽</span>
          </div>

          {/* Кнопка оплаты (меняется в зависимости от выбранного метода) */}
          <motion.button
            className="btn btn-fill"
            onClick={getPayHandler()}
            disabled={finalAmount <= 0 || (custom && parseInt(custom) > 100000)}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '16px 28px',
              fontSize: 16,
              opacity: isLoading ? 0.8 : 1
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <><i className="fas fa-spinner fa-spin" /> Ожидание оплаты...</>
            ) : (
              <><i className="fas fa-external-link-alt" /> {getPayButtonText()}</>
            )}
          </motion.button>

          <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', marginTop: 12 }}>
            После оплаты средства зачислятся автоматически в течение нескольких минут.
          </p>
        </div>

        {/* Правая колонка — история + промокоды (без изменений) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* История пополнений */}
          <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-history" style={{ color: 'var(--blue-3)' }} />
              История пополнений
            </h3>
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: 'var(--blue-3)' }} />
              </div>
            ) : transactions.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 20 }}>
                У вас пока нет пополнений
              </p>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {transactions.map(tx => (
                  <div key={tx.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,.02)',
                    border: '1px solid var(--border-dim)',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <i className="fas fa-check-circle" style={{ color: '#34d399', fontSize: 16 }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>+{tx.amount}₽</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{formatDate(tx.created_at)}</div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 12,
                      background: 'rgba(52,211,153,.1)',
                      color: '#34d399',
                      fontWeight: 600
                    }}>
                      {tx.status === 'completed' ? 'Завершено' : tx.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', flexShrink: 0 }}
              onClick={loadTransactions}
            >
              <i className="fas fa-redo-alt" /> Обновить историю
            </button>
          </div>

          {/* Промокоды (заглушка) */}
          <div className="dash-card">
            <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-ticket-alt" style={{ color: 'var(--blue-3)' }} />
              Промокоды
            </h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Введите промокод"
                style={{ flex: 1 }}
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <button
                className="btn btn-fill"
                onClick={handleActivatePromo}
                style={{ padding: '0 20px' }}
              >
                Активировать
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', marginTop: 10 }}>
              Введите промокод, чтобы получить бонус на баланс.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}