import { useState, useEffect } from 'react';
import { reviewsApi } from '../store';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await reviewsApi.adminList();
      setReviews(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот отзыв?')) return;
    setDeletingId(id);
    try {
      await reviewsApi.adminDelete(id);
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      alert('Ошибка при удалении');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="dash-card" style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin" /></div>;
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, marginBottom: 16 }}>Управление отзывами</h2>
      {reviews.length === 0 ? (
        <p>Нет отзывов</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Email</th>
                <th>Оценка</th>
                <th>Отзыв</th>
                <th>Дата</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(r => (
                <tr key={r.id}>
                  <td>{r.userName}</td>
                  <td>{r.email}</td>
                  <td>{r.rating} ★</td>
                  <td>{r.text.substring(0, 50)}...</td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {deletingId === r.id ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-trash" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}