import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'linear-gradient(145deg, var(--bg) 0%, #0b0f1a 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Анимированные фоновые элементы */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 20% 30%, rgba(37,99,235,0.1) 0%, transparent 40%)',
        }}
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 80% 70%, rgba(99,102,241,0.1) 0%, transparent 40%)',
        }}
      />

      {/* Основной контент */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          maxWidth: 600,
          textAlign: 'center',
          background: 'rgba(12, 16, 28, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 32,
          padding: '60px 40px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* 404 с эффектом */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          style={{
            fontSize: 120,
            fontWeight: 800,
            lineHeight: 1,
            marginBottom: 16,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 10px 20px rgba(37,99,235,0.3))',
          }}
        >
          404
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 16,
            color: 'var(--text-white)',
          }}
        >
          Страница не найдена
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            fontSize: 16,
            color: 'var(--text-gray)',
            marginBottom: 32,
            lineHeight: 1.6,
            maxWidth: 400,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Возможно, она была перемещена, или вы указали неверный адрес.
          Проверьте URL или вернитесь на главную.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '14px 32px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, var(--blue-1), #7c3aed)',
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s',
              boxShadow: '0 8px 20px rgba(37,99,235,0.3)',
              cursor: 'pointer',
              border: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 25px rgba(37,99,235,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(37,99,235,0.3)';
            }}
          >
            <i className="fas fa-home" />
            Вернуться на главную
          </Link>
        </motion.div>

        {/* Декоративный элемент */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            marginTop: 40,
            fontSize: 12,
            color: 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <i className="fas fa-compass" style={{ opacity: 0.5 }} />
          <span>Кажется, вы забрели не туда</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}