import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { reviewsApi, serversApi } from '../store';

export default function ReviewCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasServer, setHasServer] = useState<boolean | null>(null);
  const [hasReview, setHasReview] = useState(false);

  useEffect(() => {
    serversApi.list().then(servers => {
      setHasServer(servers.length > 0);
    });
    // Проверим, есть ли уже отзыв (опционально)
    reviewsApi.userReviews().then(reviews => {
      if (reviews.length > 0) setHasReview(true);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (text.trim().length < 3) {
      setError('Текст отзыва должен содержать минимум 3 символа');
      return;
    }
    setLoading(true);
    try {
      await reviewsApi.create(rating, text);
      navigate('/dashboard/reviews');
    } catch (err: any) {
      setError(err.message || 'Ошибка при отправке отзыва');
    } finally {
      setLoading(false);
    }
  };

  if (hasServer === false) {
    return (
      <div className="dash-card" style={{ textAlign: 'center', padding: 40 }}>
        <i className="fas fa-exclamation-circle" style={{ fontSize: 48, color: 'var(--blue-3)', marginBottom: 16 }} />
        <h2>Невозможно оставить отзыв</h2>
        <p style={{ color: 'var(--text-dim)' }}>Только клиенты с активными серверами могут оставлять отзывы.</p>
        <button className="btn btn-fill" onClick={() => navigate('/dashboard/purchase')}>
          Приобрести сервер
        </button>
      </div>
    );
  }

  if (hasReview) {
    return (
      <div className="dash-card" style={{ textAlign: 'center', padding: 40 }}>
        <i className="fas fa-check-circle" style={{ fontSize: 48, color: '#34d399', marginBottom: 16 }} />
        <h2>Вы уже оставили отзыв</h2>
        <p style={{ color: 'var(--text-dim)' }}>Спасибо за ваше мнение! Редактирование пока не поддерживается.</p>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard/reviews')}>
          Вернуться к отзывам
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 className="dash-title">Оставить отзыв</h1>
      <p className="dash-subtitle">Поделитесь впечатлениями о нашем хостинге</p>

      <div className="dash-card" style={{ padding: 28 }}>
        {error && (
          <div className="form-error" style={{ marginBottom: 20 }}>
            <i className="fas fa-exclamation-circle" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label>Оценка</label>
            <div style={{ display: 'flex', gap: 8, fontSize: 24 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <i
                  key={star}
                  className={`fas fa-star ${(hoverRating || rating) >= star ? 'active' : ''}`}
                  style={{
                    cursor: 'pointer',
                    color: (hoverRating || rating) >= star ? '#fbbf24' : 'var(--border-light)',
                    transition: 'color 0.1s',
                  }}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label>Ваш отзыв</label>
            <textarea
              className="form-input"
              rows={5}
              placeholder="Напишите, что вам понравилось или что можно улучшить..."
              value={text}
              onChange={e => setText(e.target.value)}
              required
              minLength={3}
            />
          </div>

          <button
            type="submit"
            className="btn btn-fill"
            disabled={loading}
            style={{ width: '100%', padding: 14 }}
          >
            {loading ? <i className="fas fa-spinner fa-spin" /> : 'Отправить отзыв'}
          </button>
        </form>
      </div>
    </div>
  );
}