import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tariff, plansApi, reviewsApi, Review } from '../store';

export default function Landing() {
  const [pinned, setPinned] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const onScroll = () => setPinned(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    plansApi.list().then(setTariffs).catch(() => {});
    reviewsApi.list(10).then(setReviews).catch(() => {});
  }, []);

  // Автосмена каждые 5 секунд
  useEffect(() => {
    if (reviews.length <= 1) return;
    intervalRef.current = setInterval(() => {
      nextReview();
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [reviews.length, currentIndex]);

  const nextReview = () => {
    if (isAnimating || reviews.length === 0) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const prevReview = () => {
    if (isAnimating || reviews.length === 0) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const goToReview = (index: number) => {
    if (isAnimating || index === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const revRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = revRef.current?.querySelectorAll('[data-r]');
    if (!els) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('shown'), i * 80);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [tariffs, reviews]);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={revRef}>
      <div className="amb amb-1" /><div className="amb amb-2" />
      <header className={`land-header ${pinned ? 'pinned' : ''}`}>
        <div className="wrap">
          <Link to="/" className="logo">
            <svg viewBox="0 0 30 30" fill="none"><rect width="30" height="30" rx="7" fill="#2563eb"/><path d="M9 21V9l6 4.5L21 9v12l-6-4.5L9 21z" fill="#fff" opacity=".9"/></svg>
            <span>Luminarix</span>
          </Link>
          <nav className={`land-nav ${menuOpen ? 'open' : ''}`}>
		    <Link to="/status" className="nav-link">Статус</Link>
            <a onClick={() => scrollTo('advantages')}>Преимущества</a>
            <a onClick={() => scrollTo('pricing')}>Тарифы</a>
            <a onClick={() => scrollTo('reviews')}>Отзывы</a>
            <Link to="/login" className="cta-sm">Личный кабинет</Link>
          </nav>
          <button className={`burger ${menuOpen ? 'on' : ''}`} onClick={() => setMenuOpen(!menuOpen)}><i /><i /><i /></button>
        </div>
      </header>

      <section className="hero">
        <div className="wrap">
          <div className="hero-left" data-r>
            <div className="chip"><span className="dot" /> Все системы работают</div>
            <h1>Серверы, которые<br />не <em>подведут</em></h1>
            <p>Запусти свой игровой сервер за минуту. Мощное железо, защита от DDoS и поддержка, которая реально помогает.</p>
            <div className="hero-btns">
              <a className="btn btn-fill" onClick={() => scrollTo('pricing')}><span>Выбрать тариф</span> <i className="fas fa-arrow-right" style={{ fontSize: 12 }} /></a>
              <a className="btn btn-ghost" onClick={() => scrollTo('advantages')}>Подробнее</a>
            </div>
            <div className="metrics">
              <div className="metric"><strong>20+</strong><span>Серверов</span></div>
              <div className="metric"><strong>99.8%</strong><span>Uptime</span></div>
              <div className="metric"><strong>&lt;5ms</strong><span>Отклик</span></div>
            </div>
          </div>
          <div className="hero-visual" data-r>
            <div className="hero-card-float">
              <div className="hcf-header"><h3>WarRise</h3><div className="hcf-status">Online</div></div>
              <div className="hcf-rows">
                <div><div className="hcf-row"><span className="label">CPU</span><span className="val">23%</span></div><div className="hcf-bar"><div style={{ width: '23%' }} /></div></div>
                <div><div className="hcf-row"><span className="label">RAM</span><span className="val">7.2 / 16 GB</span></div><div className="hcf-bar"><div style={{ width: '52%' }} /></div></div>
                <div><div className="hcf-row"><span className="label">SSD</span><span className="val">2 / 48 GB</span></div><div className="hcf-bar"><div style={{ width: '24%' }} /></div></div>
                <div><div className="hcf-row"><span className="label">Игроки</span><span className="val">34 / 50</span></div><div className="hcf-bar"><div style={{ width: '68%' }} /></div></div>
              </div>
              <div className="float-tag t1"><i className="fas fa-shield-halved" /> DDoS защита активна</div>
              <div className="float-tag t2"><i className="fas fa-bolt" /> Пинг 4ms</div>
            </div>
          </div>
        </div>
      </section>

      <section className="adv" id="advantages">
        <div className="wrap">
          <div className="sec-head" data-r><div className="label">Преимущества</div><h2>Почему выбирают <em>нас</em></h2><p>Мы не просто хостинг — мы инфраструктура, на которую можно положиться</p></div>
          <div className="adv-grid">
            {[
              { icon: 'fa-microchip', title: 'Мощное железо', desc: 'E5-2699 v4, DDR4 ECC, NVMe Gen4. Частота до 3.6 ГГц — никаких лагов' },
              { icon: 'fa-shield-halved', title: 'Защита от DDoS', desc: 'Фильтрация атак до 1.2 Tbps. Сервер работает даже под атакой' },
              { icon: 'fa-rocket', title: 'Старт за 60 секунд', desc: 'Выбрали игру, оплатили — сервер уже работает. Полная автоматизация' },
              { icon: 'fa-headset', title: 'Живая поддержка', desc: 'Реальные люди, среднее время ответа 3 минуты' },
              { icon: 'fa-signal', title: 'Минимальный пинг', desc: 'Дата-центры в Нидерландах. Пинг от 35ms для СНГ и Европы' },
              { icon: 'fa-sliders', title: 'Полный контроль', desc: 'Моды, плагины, бекапы, консоль. Всё в одном месте' },
            ].map((item, i) => (
              <div className="adv-item" data-r key={i}>
                <div className="ico"><i className={`fas ${item.icon}`} /></div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pricing" id="pricing">
        <div className="wrap">
          <div className="sec-head" data-r><div className="label">Тарифы</div><h2>Простые и честные <em>цены</em></h2><p>Без скрытых платежей. Выберите план — остальное мы берём на себя</p></div>
          <div className="pricing-controls" data-r>
            <div className="type-tabs"><button className="type-tab active"><i className="fas fa-gamepad" /> Игровые серверы</button></div>
            <div className="loc-select">
              <span className="loc-label">Локация:</span>
              <button className="loc-btn active"><span className="flag flag-nl" /> Нидерланды</button>
              <button className="loc-btn disabled" disabled><span className="flag flag-de" /> Германия<span className="soon-badge">Скоро</span></button>
            </div>
          </div>
          <div className="price-grid">
            {tariffs.map((t: Tariff) => (
              <div className={`price-card ${t.popular ? 'hl' : ''}`} data-r key={t.id}>
                {t.popular && <div className="price-tag">Популярный</div>}
                <div className="game-row">
                  <div className="game-ico"><i className={`fas ${t.icon}`} /></div>
                  <div><div className="tier">{t.tier}</div><div className="name">{t.name}</div></div>
                </div>
                <div className="amount">{t.price}₽ <small>/ мес</small></div>
                <div className="per">{t.description}</div>
                <ul>{t.features.map((f: string, fi: number) => <li key={fi}>{f}</li>)}</ul>
                <Link to="/dashboard/purchase" className={`btn ${t.popular ? 'btn-fill' : 'btn-ghost'}`}>Выбрать</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Секция отзывов (без кнопок управления) */}
      <section className="reviews" id="reviews">
        <div className="wrap">
          <div className="sec-head" data-r>
            <div className="label">Отзывы</div>
            <h2>Нам <em>доверяют</em></h2>
            <p>Реальные отзывы от реальных клиентов</p>
          </div>

          {reviews.length > 0 ? (
            <div className="reviews-carousel" data-r>
              <div className="reviews-track" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                {reviews.map((review) => (
                  <div className="review-card" key={review.id}>
                    <div className="review-header">
                      <div className="reviewer-avatar">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="reviewer-info">
                        <div className="reviewer-name">{review.userName}</div>
                        <div className="review-date">
                          {new Date(review.createdAt).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="review-stars">
                      {[1, 2, 3, 4, 5].map(i => (
                        <i
                          key={i}
                          className={`fas fa-star ${i <= review.rating ? 'filled' : ''}`}
                        />
                      ))}
                    </div>
                    <div className="review-text">
                      <i className="fas fa-quote-left quote-icon" />
                      <p>{review.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Кнопки навигации и точки удалены */}
            </div>
          ) : (
            <div className="no-reviews" data-r>
              <i className="fas fa-star" />
              <p>Отзывов пока нет. Станьте первым!</p>
            </div>
          )}
        </div>
      </section>

      <section className="cta-sec">
        <div className="wrap">
          <div className="cta-block" data-r>
            <h2>Готовы <em>начать</em>?</h2>
            <p>Запустите свой сервер прямо сейчас — установка за минуту, оплата от 39₽</p>
            <Link to="/register" className="btn btn-fill">Начать сейчас <i className="fas fa-arrow-right" style={{ fontSize: 12 }} /></Link>
          </div>
        </div>
      </section>

      <footer className="land-footer">
        <div className="wrap">
          <div className="ft-top">
            <div className="ft-brand">
              <Link to="/" className="logo">
                <svg viewBox="0 0 30 30" fill="none" width="28" height="28"><rect width="30" height="30" rx="7" fill="#2563eb"/><path d="M9 21V9l6 4.5L21 9v12l-6-4.5L9 21z" fill="#fff" opacity=".9"/></svg>
                <span>Luminarix</span>
              </Link>
              <p>Игровой хостинг нового поколения.</p>
              <div className="ft-socials">
                <a href="https://discord.gg/D3t72az3WX"><i className="fab fa-discord" /></a>
                <a href="https://t.me/luminarix_hosting"><i className="fab fa-telegram" /></a>
                <a href="https://vk.com/Luminarix"><i className="fab fa-vk" /></a>
              </div>
            </div>
            <div className="ft-col">
              <h4>Навигация</h4>
              <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Главная</a>
              <a href="#" onClick={e => { e.preventDefault(); scrollTo('advantages'); }}>Преимущества</a>
              <a href="#" onClick={e => { e.preventDefault(); scrollTo('pricing'); }}>Тарифы</a>
            </div>
            <div className="ft-col">
              <h4>Услуги</h4>
              <a href="#">Minecraft хостинг</a>
            </div>
            <div className="ft-col">
              <h4>Помощь</h4>
              <a href="https://discord.gg/D3t72az3WX">Discord</a>
              <a href="https://t.me/luminarix_hosting">Telegram</a>
            </div>
          </div>
          <div className="ft-bottom">
            <p>© 2026 Luminarix. Все права защищены.</p>
            <div className="ft-bottom-links">
              <a href="/policy">Конфиденциальность</a>
              <a href="/offert">Офферта</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}