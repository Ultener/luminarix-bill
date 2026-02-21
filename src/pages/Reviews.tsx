import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { reviewsApi, Review } from '../store';

export default function Reviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await reviewsApi.userReviews();
      setReviews(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dash-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--blue-3)' }} />
        <p style={{ marginTop: 16, color: 'var(--text-dim)' }}>Загрузка отзывов...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Заголовок и кнопка */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h1 className="dash-title" style={{ marginBottom: 8 }}>Мои отзывы</h1>
          <p className="dash-subtitle" style={{ marginBottom: 0 }}>
            Все оставленные вами отзывы о нашем хостинге
          </p>
        </div>
        <Link to="/dashboard/review/create" className="btn btn-fill">
          <i className="fas fa-plus" style={{ marginRight: 8 }} />
          Написать отзыв
        </Link>
      </div>

      {reviews.length === 0 ? (
        <div className="dash-card" style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'linear-gradient(135deg, rgba(37,99,235,0.02) 0%, rgba(124,58,237,0.02) 100%)',
          borderRadius: 24
        }}>
          <i className="fas fa-star" style={{ fontSize: 56, color: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 24, marginBottom: 8 }}>У вас пока нет отзывов</h3>
          <p style={{ color: 'var(--text-dim)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            Оставьте свой первый отзыв и помогите другим пользователям сделать правильный выбор!
          </p>
          <Link to="/dashboard/review/create" className="btn btn-fill">
            Написать первый отзыв
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: 24
        }}>
          {reviews.map(review => (
            <div
              key={review.id}
              className="dash-card"
              style={{
                padding: 24,
                borderRadius: 24,
                transition: 'box-shadow 0.2s',
                cursor: 'default'
              }}
            >
              {/* Верхняя часть: рейтинг и дата */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <i
                      key={i}
                      className="fas fa-star"
                      style={{
                        fontSize: 18,
                        color: i <= review.rating ? '#fbbf24' : 'rgba(255,255,255,0.2)'
                      }}
                    />
                  ))}
                </div>
                <span style={{
                  fontSize: 13,
                  color: 'var(--text-dim)',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '4px 12px',
                  borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <i className="fas fa-calendar-alt" style={{ marginRight: 6, fontSize: 11, color: 'var(--blue-3)' }} />
                  {new Date(review.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>

              {/* Текст отзыва */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16
              }}>
                <p style={{
                  lineHeight: 1.6,
                  color: 'var(--text-gray)',
                  fontStyle: 'italic',
                  margin: 0
                }}>
                  <i className="fas fa-quote-left" style={{ marginRight: 8, fontSize: 14, color: 'var(--blue-3)', opacity: 0.5 }} />
                  {review.text}
                </p>
              </div>

              {/* Информация о пользователе */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderTop: '1px solid rgba(255,255,255,0.05)',
                paddingTop: 16
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 16
                }}>
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{user?.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    Отзыв от {new Date(review.createdAt).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}