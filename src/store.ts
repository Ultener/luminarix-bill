// ============ TYPES ============
export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  isAdmin: boolean;
  role: 'user' | 'admin' | 'support';
  blocked: boolean;
  createdAt: string;
  pterodactylUserId?: number;
  verified?: boolean;
  twoFactorEnabled?: boolean;
}

export interface GameServer {
  id: string;
  userId: string;
  name: string;
  tariffId: string;
  tariffName: string;
  tariffTier: string;
  type: string;
  coreName: string;
  status: 'active' | 'suspended' | 'expired';
  ram: number;
  cores: number;
  disk: number;
  price: number;
  months: number;
  expiresAt: string;
  createdAt: string;
  ip?: string;
  port?: number;
  node?: number;
  pterodactylServerId?: number;
  pterodactylIdentifier?: string;
  pterodactylUuid?: string;
  autoRenew?: boolean;
}

export interface Tariff {
  id: string;
  name: string;
  tier: string;
  type: string;
  price: number;
  ram: number;
  cores: number;
  disk: number;
  features: string[];
  popular: boolean;
  icon: string;
  description: string;
}

export interface Ticket {
  id: string;
  userId: string;
  username: string;
  subject: string;
  category: string;
  status: 'open' | 'answered' | 'closed';
  createdAt: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  authorId: string;
  authorName: string;
  isStaff: boolean;
  content: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  operation_id: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface Review {
  id: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: string;
}

export const GAME_CORES = [
  { id: 'paper', name: 'Paper', icon: 'fa-scroll', desc: 'Высокопроизводительный форк Spigot' },
  { id: 'purpur', name: 'Purpur', icon: 'fa-gem', desc: 'Форк Paper с дополнительными фичами' },
  { id: 'vanilla', name: 'Vanilla', icon: 'fa-cube', desc: 'Оригинальный сервер Minecraft' },
  { id: 'forge', name: 'Forge', icon: 'fa-wrench', desc: 'Для модов Minecraft' },
  { id: 'fabric', name: 'Fabric', icon: 'fa-layer-group', desc: 'Легковесный загрузчик модов' },
  { id: 'spigot', name: 'Spigot', icon: 'fa-bolt', desc: 'Популярный сервер с плагинами' },
];

export const TICKET_CATEGORIES = [
  'Техническая проблема', 'Вопрос по оплате', 'Запрос функции', 'Жалоба', 'Другое',
];

// ============ API CLIENT ============
function getToken(): string | null {
  return localStorage.getItem('lmx_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('lmx_token', token);
  else localStorage.removeItem('lmx_token');
}

async function api(method: string, url: string, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Auth
export const authApi = {
  login: (email: string, password: string, recaptchaToken?: string) =>
    api('POST', '/api/auth/login', { email, password, recaptchaToken }),
  register: (username: string, email: string, password: string, recaptchaToken?: string) =>
    api('POST', '/api/auth/register', { username, email, password, recaptchaToken }),
  verify: (email: string, code: string) =>
    api('POST', '/api/auth/verify', { email, code }),
  forgot: (email: string) =>
    api('POST', '/api/auth/forgot', { email }),
  reset: (email: string, code: string, newPassword: string) =>
    api('POST', '/api/auth/reset', { email, code, newPassword }),
  me: () => api('GET', '/api/auth/me'),
  logout: () => api('POST', '/api/auth/logout'),
  updateProfile: (data: { username?: string; email?: string }) =>
    api('PUT', '/api/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api('PUT', '/api/auth/password', { currentPassword, newPassword }),

  // 2FA methods
  twoFactorStatus: () => api('GET', '/api/auth/2fa/status'),
  twoFactorEnable: () => api('POST', '/api/auth/2fa/enable', {}),
  twoFactorVerify: (token: string) => api('POST', '/api/auth/2fa/verify', { token }),
  twoFactorDisable: (password: string) => api('POST', '/api/auth/2fa/disable', { password }),
  twoFactorVerifyLogin: (tempToken: string, code: string) =>
    api('POST', '/api/auth/2fa/verify-login', { tempToken, code }),
};

// Plans
export const plansApi = {
  list: (): Promise<Tariff[]> => api('GET', '/api/plans'),
  create: (data: Partial<Tariff>) => api('POST', '/api/plans', data),
  update: (id: string, data: Partial<Tariff>) => api('PUT', `/api/plans/${id}`, data),
  delete: (id: string) => api('DELETE', `/api/plans/${id}`),
};

// Servers
export const serversApi = {
  list: (): Promise<GameServer[]> => api('GET', '/api/servers'),
  get: (id: string): Promise<GameServer> => api('GET', `/api/servers/${id}`),
  create: (data: Record<string, unknown>) => api('POST', '/api/servers', data),
  update: (id: string, data: Record<string, unknown>) => api('PUT', `/api/servers/${id}`, data),
  delete: (id: string) => api('DELETE', `/api/servers/${id}`),
  renew: (id: string, months: number) => api('POST', `/api/servers/${id}/renew`, { months }),
  changeTariff: (id: string, tariffId: string): Promise<{ server: GameServer; user: User }> => 
    api('POST', `/api/servers/${id}/change-tariff`, { tariffId }),
};

// Tickets
export const ticketsApi = {
  list: (): Promise<Ticket[]> => api('GET', '/api/tickets'),
  create: (subject: string, category: string, message: string) => api('POST', '/api/tickets', { subject, category, message }),
  reply: (id: string, content: string) => api('POST', `/api/tickets/${id}/messages`, { content }),
  close: (id: string) => api('PUT', `/api/tickets/${id}`, { status: 'closed' }),
};

// Admin
export const adminApi = {
  users: (): Promise<User[]> => api('GET', '/api/admin/users'),
  updateUser: (id: string, data: {
    username?: string;
    email?: string;
    password?: string;
    balance?: number;
    role?: 'user' | 'admin' | 'support';
    blocked?: boolean;
    twoFactorEnabled?: boolean;
  }) => api('PUT', `/api/admin/users/${id}`, data),
  deleteUser: (id: string) => api('DELETE', `/api/admin/users/${id}`),
  updateServer: (id: string, data: Record<string, unknown>) => api('PUT', `/api/admin/servers/${id}`, data),
  deleteServer: (id: string) => api('DELETE', `/api/admin/servers/${id}`),
  deleteTicket: (id: string) => api('DELETE', `/api/admin/tickets/${id}`),
  deleteAllTickets: () => api('DELETE', '/api/admin/tickets'),
};

// TopUp
export const topupApi = {
  add: (amount: number) => api('POST', '/api/topup', { amount }),
};

// Transactions
export const transactionsApi = {
  list: (): Promise<Transaction[]> => api('GET', '/api/transactions'),
};

// Pterodactyl
export const pteroApi = {
  test: () => api('GET', '/api/ptero/test') as Promise<{ success: boolean; total_servers?: number; error?: string }>,
  servers: () => api('GET', '/api/ptero/servers'),
  users: () => api('GET', '/api/ptero/users'),
  suspend: (id: number) => api('POST', `/api/ptero/servers/${id}/suspend`),
  unsuspend: (id: number) => api('POST', `/api/ptero/servers/${id}/unsuspend`),
  deleteServer: (id: number) => api('DELETE', `/api/ptero/servers/${id}`),
  provision: (data: Record<string, unknown>) => api('POST', '/api/ptero/provision', data) as Promise<{
    success: boolean; error?: string; pterodactylUserId?: number;
    server?: { id: number; identifier: string; uuid: string; name: string; node: number; ip: string; port: number };
  }>,
};

// ============ REVIEWS API ============
export const reviewsApi = {
  // Публичные отзывы
  list: (limit: number = 10): Promise<Review[]> => 
    api('GET', `/api/reviews?limit=${limit}`),

  // Создать отзыв
  create: (rating: number, text: string): Promise<Review> => 
    api('POST', '/api/reviews', { rating, text }),

  // Отзывы текущего пользователя
  userReviews: (): Promise<Review[]> => 
    api('GET', '/api/user/reviews'),

  // Админские методы
  adminList: (): Promise<(Review & { email: string })[]> => 
    api('GET', '/api/admin/reviews'),

  adminDelete: (id: string): Promise<{ success: boolean }> => 
    api('DELETE', `/api/admin/reviews/${id}`),
};