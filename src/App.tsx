import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, authApi, setToken as setTokenStore } from './store';
import { AnimatePresence, motion } from 'framer-motion';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import DashboardLayout from './pages/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import MyServers from './pages/MyServers';
import ServerManage from './pages/ServerManage';
import PurchaseFlow from './pages/PurchaseFlow';
import AccountSettings from './pages/AccountSettings';
import TopUp from './pages/TopUp';
import AdminPanel from './pages/AdminPanel';
import Tickets from './pages/Tickets';
import Policy from './pages/Policy';
import Offert from './pages/Offert';
import Reviews from './pages/Reviews';
import ReviewCreate from './pages/ReviewCreate';
import Status from './pages/Status';
import DiscordCallback from './pages/DiscordCallback';
import NotFound from './pages/NotFound';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, recaptchaToken?: string) => Promise<string | null>;
  register: (username: string, email: string, password: string) => Promise<string | null>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const AuthContext = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lmx_token');
    if (token) {
      authApi.me()
        .then(d => setUser(d.user))
        .catch(() => setTokenStore(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleSetToken = (token: string | null) => {
    setTokenStore(token);
    if (!token) setUser(null);
  };

  const login = async (email: string, password: string, recaptchaToken?: string): Promise<string | null> => {
    try {
      const d = await authApi.login(email, password, recaptchaToken);
      if (d.require2FA) return null;
      handleSetToken(d.token);
      setUser(d.user);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Ошибка входа';
    }
  };

  const register = async (username: string, email: string, password: string): Promise<string | null> => {
    try {
      await authApi.register(username, email, password);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Ошибка регистрации';
    }
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    handleSetToken(null);
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const d = await authApi.me();
      setUser(d.user);
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser, setToken: handleSetToken }}>
      {children}
    </AuthContext.Provider>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--blue-3)' }} /></div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function StaffOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user || (user.role !== 'admin' && user.role !== 'support' && !user.isAdmin)) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -16 },
};
const pageTrans = { duration: 0.25 };

function PageWrap({ children }: { children: ReactNode }) {
  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTrans}>
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrap><Landing /></PageWrap>} />
        <Route path="/login" element={<PageWrap><Auth mode="login" /></PageWrap>} />
        <Route path="/register" element={<PageWrap><Auth mode="register" /></PageWrap>} />
        <Route path="/forgot" element={<PageWrap><Auth mode="forgot" /></PageWrap>} />
        <Route path="/reset" element={<PageWrap><Auth mode="reset" /></PageWrap>} />
        <Route path="/verify" element={<PageWrap><Auth mode="verify" /></PageWrap>} />
        <Route path="/policy" element={<PageWrap><Policy /></PageWrap>} />
        <Route path="/offert" element={<PageWrap><Offert /></PageWrap>} />
        <Route path="/status" element={<PageWrap><Status /></PageWrap>} />
        <Route path="/auth/discord/success" element={<PageWrap><DiscordCallback /></PageWrap>} />
        <Route path="/auth/discord/error" element={<PageWrap><DiscordCallback /></PageWrap>} />

        <Route path="/dashboard" element={<Protected><DashboardLayout /></Protected>}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<PageWrap><DashboardHome /></PageWrap>} />
          <Route path="servers" element={<PageWrap><MyServers /></PageWrap>} />
          <Route path="server/:id" element={<PageWrap><ServerManage /></PageWrap>} />
          <Route path="purchase" element={<PageWrap><PurchaseFlow /></PageWrap>} />
          <Route path="settings" element={<PageWrap><AccountSettings /></PageWrap>} />
          <Route path="topup" element={<PageWrap><TopUp /></PageWrap>} />
          <Route path="tickets" element={<PageWrap><Tickets /></PageWrap>} />
          <Route path="reviews" element={<PageWrap><Reviews /></PageWrap>} />
          <Route path="review/create" element={<PageWrap><ReviewCreate /></PageWrap>} />
          <Route path="admin" element={<StaffOnly><PageWrap><AdminPanel /></PageWrap></StaffOnly>} />
        </Route>

        <Route path="*" element={<PageWrap><NotFound /></PageWrap>} />
      </Routes>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnimatedRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}