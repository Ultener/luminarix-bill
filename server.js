import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import speakeasy from 'speakeasy';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import morgan from 'morgan';
import validator from 'validator';
import fs from 'fs';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.set('trust proxy', 1);
app.use(cookieParser());

// ========== DISCORD OAUTH2 CONFIG ==========
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://luminarix.fun/api/auth/discord/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://luminarix.fun';
const DISCORD_API_ENDPOINT = 'https://discord.com/api/v10';

// ========== SECURITY MIDDLEWARES ==========
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://luminarix.fun',
  'https://console.luminarix.fun',
  'https://www.google.com'
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const logStream = fs.createWriteStream(join(__dirname, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: logStream }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Слишком много попыток. Повторите позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());

// ══════════════════════════════════════════════════
// SMTP CONFIGURATION
// ══════════════════════════════════════════════════
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtphost.ru',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'admin@exemple.com',
    pass: process.env.SMTP_PASS || 'youPass',
  },
  from: process.env.SMTP_FROM || 'noreplu@exemple.com',
};

let transporter;
try {
  transporter = nodemailer.createTransport(smtpConfig);
  console.log('[SMTP] Configured');
} catch (e) {
  console.error('[SMTP] Configuration error:', e.message);
}

// ══════════════════════════════════════════════════
// RECAPTCHA CONFIGURATION
// ══════════════════════════════════════════════════
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '';
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

// ══════════════════════════════════════════════════
// PTERODACTYL CONFIGURATION
// ══════════════════════════════════════════════════
const PTERO_URL = process.env.PTERO_URL || 'https://console.luminarix.fun';
const PTERO_ADMIN_KEY = process.env.PTERO_ADMIN_KEY || 'ptla_NP8LbEO7IN9slQ1qai9S9u4nwlnTpmgUFedNy2zihDu';

// ══════════════════════════════════════════════════
// DATABASE SETUP (SQLite)
// ══════════════════════════════════════════════════
const db = new Database(join(__dirname, 'luminarix.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    balance REAL DEFAULT 0,
    role TEXT DEFAULT 'user' CHECK(role IN ('user','admin','support')),
    blocked INTEGER DEFAULT 0,
    pterodactylUserId INTEGER,
    verified INTEGER DEFAULT 0,
    twoFactorSecret TEXT,
    twoFactorEnabled INTEGER DEFAULT 0,
    lastTicketAt TEXT,
    discordId TEXT UNIQUE,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    tariffId TEXT,
    tariffName TEXT,
    tariffTier TEXT,
    type TEXT DEFAULT 'game',
    coreName TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','suspended','expired')),
    ram INTEGER DEFAULT 0,
    cores INTEGER DEFAULT 0,
    disk INTEGER DEFAULT 0,
    price REAL DEFAULT 0,
    months INTEGER DEFAULT 1,
    expiresAt TEXT,
    ip TEXT,
    port INTEGER,
    node INTEGER,
    pterodactylServerId INTEGER,
    pterodactylIdentifier TEXT,
    pterodactylUuid TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    username TEXT,
    subject TEXT NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'open' CHECK(status IN ('open','answered','closed')),
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ticket_messages (
    id TEXT PRIMARY KEY,
    ticketId TEXT NOT NULL,
    authorId TEXT NOT NULL,
    authorName TEXT,
    isStaff INTEGER DEFAULT 0,
    content TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tier TEXT NOT NULL,
    type TEXT DEFAULT 'game',
    price REAL NOT NULL,
    ram INTEGER NOT NULL,
    cores INTEGER NOT NULL,
    disk INTEGER NOT NULL,
    features TEXT DEFAULT '[]',
    popular INTEGER DEFAULT 0,
    icon TEXT DEFAULT 'fa-cube',
    description TEXT DEFAULT '',
    sortOrder INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    operation_id TEXT UNIQUE NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS temp_tokens (
    token TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    userName TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    text TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ========== НАДЁЖНОЕ ДОБАВЛЕНИЕ КОЛОНОК (если их нет) ==========
try {
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const columnNames = tableInfo.map(col => col.name);

  if (!columnNames.includes('discordId')) {
    // Добавляем колонку без UNIQUE (SQLite не позволяет добавить UNIQUE через ALTER)
    db.prepare("ALTER TABLE users ADD COLUMN discordId TEXT").run();
    console.log('[DB] Added discordId column to users table');
    
    // Создаём уникальный индекс отдельно
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_discordId ON users(discordId)").run();
    console.log('[DB] Created unique index on discordId');
  }

  if (!columnNames.includes('verified')) {
    db.prepare("ALTER TABLE users ADD COLUMN verified INTEGER DEFAULT 1").run();
  }

  if (!columnNames.includes('twoFactorSecret')) {
    db.prepare("ALTER TABLE users ADD COLUMN twoFactorSecret TEXT").run();
  }

  if (!columnNames.includes('twoFactorEnabled')) {
    db.prepare("ALTER TABLE users ADD COLUMN twoFactorEnabled INTEGER DEFAULT 0").run();
  }

  if (!columnNames.includes('lastTicketAt')) {
    db.prepare("ALTER TABLE users ADD COLUMN lastTicketAt TEXT").run();
    console.log('[DB] Added lastTicketAt column to users table');
  }

  // Для таблицы servers
  const serverTableInfo = db.prepare("PRAGMA table_info(servers)").all();
  const serverColumns = serverTableInfo.map(col => col.name);
  if (!serverColumns.includes('autoRenew')) {
    db.prepare("ALTER TABLE servers ADD COLUMN autoRenew INTEGER DEFAULT 0").run();
  }

} catch (e) {
  console.error('[DB] Error adding columns:', e.message);
}

// ══════════════════════════════════════════════════
// SEED: Default admin + plans
// ══════════════════════════════════════════════════
function genId() {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('mishakakawka123@mail.ru');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('KailyTeam2026ope', 10);
  db.prepare('INSERT INTO users (id, username, email, password, balance, role, verified) VALUES (?,?,?,?,?,?,?)').run(
    'admin_' + genId(), 'kailyteam_mishakakawka', 'mishakakawka123@mail.ru', hashedPassword, 99999, 'admin', 1
  );
  console.log('[DB] Admin account created');
}

const plansExist = db.prepare('SELECT COUNT(*) as c FROM plans').get();
if (plansExist.c === 0) {
  const defaultPlans = [
    { id: 'game-rabbit', name: 'Lite', tier: 'Кролик', price: 39, ram: 3072, cores: 1, disk: 25600, features: JSON.stringify(['3 ГБ RAM','1 ядро (E5-2699 v4)','25 ГБ NVMe SSD','DDoS защита','Базовая поддержка']), popular: 0, icon: 'fa-cube', description: 'Для небольших серверов', sortOrder: 1 },
    { id: 'game-sheep', name: 'Lite', tier: 'Овца', price: 79, ram: 4096, cores: 2, disk: 51200, features: JSON.stringify(['4 ГБ RAM','1.5 ядра (E5-2699 v4)','50 ГБ NVMe SSD','DDoS защита','Базовая поддержка']), popular: 1, icon: 'fa-fire', description: 'Оптимальный для большинства', sortOrder: 2 },
    { id: 'game-premium', name: 'Ultimate', tier: 'Premium', price: 129, ram: 6144, cores: 2, disk: 76800, features: JSON.stringify(['6 ГБ RAM','2 ядра (E5-2699 v4)','75 ГБ NVMe SSD','DDoS защита','Базовая поддержка']), popular: 0, icon: 'fa-crown', description: 'Максимум мощности', sortOrder: 3 },
  ];
  const ins = db.prepare('INSERT INTO plans (id,name,tier,price,ram,cores,disk,features,popular,icon,description,sortOrder) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const p of defaultPlans) {
    ins.run(p.id, p.name, p.tier, p.price, p.ram, p.cores, p.disk, p.features, p.popular, p.icon, p.description, p.sortOrder);
  }
  console.log('[DB] Default plans created');
}

// ══════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ══════════════════════════════════════════════════
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Необходима авторизация' });
  const session = db.prepare('SELECT userId FROM sessions WHERE token = ?').get(token);
  if (!session) return res.status(401).json({ error: 'Сессия истекла' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId);
  if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
  if (user.blocked) return res.status(403).json({ error: 'Аккаунт заблокирован' });
  if (!user.verified) return res.status(403).json({ error: 'Аккаунт не подтверждён. Проверьте почту.' });
  req.user = user;
  next();
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'support') {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  next();
}

// ══════════════════════════════════════════════════
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ══════════════════════════════════════════════════

async function ptero(method, endpoint, body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${PTERO_ADMIN_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(30000)
  };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) opts.body = JSON.stringify(body);
  const url = `${PTERO_URL}/api/application${endpoint}`;
  console.log(`[PTERO] ${method} ${url}`);
  let res;
  try {
    res = await fetch(url, opts);
  } catch (e) {
    if (e.name === 'TimeoutError') {
      throw new Error('Pterodactyl не ответил за 30 секунд (таймаут)');
    }
    throw new Error(`Pterodactyl недоступен: ${e.message}`);
  }
  if (res.status === 204) return { success: true };
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    if (text.includes('Login to Continue') || text.includes('login')) {
      throw new Error('Ошибка аутентификации Pterodactyl. Проверьте API-ключ.');
    }
    throw new Error(`Некорректный ответ от Pterodactyl (HTTP ${res.status})`);
  }
  if (!res.ok) {
    const msg = json.errors ? json.errors.map(e => e.detail || e.code).join('; ') : `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return json;
}

function genPassword(len = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
  let pw = '';
  for (let i = 0; i < len; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

async function ensurePterodactylUser(email, username) {
  try {
    const existing = await ptero('GET', `/users?filter[email]=${encodeURIComponent(email)}`);
    if (existing.data?.length > 0) {
      const userId = existing.data[0].attributes.id;
      console.log(`[PTERO] Found existing user ${email} with id ${userId}`);
      return { pteroUserId: userId, created: false };
    }

    const safeName = (username || 'user').replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 28) || 'user';
    const password = genPassword();
    const newUser = await ptero('POST', '/users', {
      email,
      username: safeName + '_' + Math.floor(Math.random() * 10000),
      first_name: username || 'User',
      last_name: 'Luminarix',
      password,
    });
    const pteroUserId = newUser.attributes.id;
    console.log(`[PTERO] Created new user ${email} with id ${pteroUserId}`);

    try {
      await sendPterodactylCredentials(email, safeName, password);
    } catch (emailErr) {
      console.error('[PTERO] Failed to send credentials email:', emailErr);
    }

    return { pteroUserId, created: true, password };
  } catch (error) {
    console.error('[PTERO] ensurePterodactylUser error:', error);
    return { pteroUserId: null, created: false, error: error.message };
  }
}

async function sendPterodactylCredentials(email, pteroUsername, pteroPassword) {
  if (!transporter) {
    console.error('[EMAIL] No transporter configured');
    return;
  }
  const mailOptions = {
    from: smtpConfig.from,
    to: email,
    subject: 'Доступ к панели Pterodactyl — Luminarix',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0f1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: linear-gradient(145deg, #131927 0%, #0d1422 100%); border-radius: 24px; border: 1px solid #2a3346; overflow: hidden; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.8); }
          .header { background: #1e2a47; padding: 30px; text-align: center; border-bottom: 1px solid #2e3b55; }
          .header img { width: 60px; height: 60px; border-radius: 16px; margin-bottom: 15px; }
          .header h1 { color: #fff; font-size: 28px; margin: 0; font-weight: 700; }
          .header p { color: #9aa8c7; margin: 8px 0 0; font-size: 16px; }
          .content { padding: 40px 30px; color: #e0e7ff; }
          .content p { font-size: 16px; line-height: 1.6; margin: 0 0 20px; }
          .credentials { background: #0f1629; border: 1px solid #2a3a5a; border-radius: 20px; padding: 25px; margin: 30px 0; }
          .cred-item { margin-bottom: 20px; }
          .cred-item:last-child { margin-bottom: 0; }
          .cred-label { font-size: 14px; color: #7f8fb2; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
          .cred-value { font-size: 20px; font-weight: 600; color: #fff; background: #1e2740; padding: 10px 15px; border-radius: 12px; border-left: 4px solid #2563eb; word-break: break-all; }
          .button { display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; text-decoration: none; padding: 14px 32px; border-radius: 40px; font-weight: 600; font-size: 16px; margin-top: 20px; border: 1px solid #3b6eff; box-shadow: 0 8px 20px -5px #1e3a8a; }
          .footer { background: #0c111e; padding: 25px; text-align: center; border-top: 1px solid #1f2a3f; font-size: 14px; color: #5d6f94; }
          .footer a { color: #6094ea; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <svg width="60" height="60" viewBox="0 0 30 30" fill="none">
              <rect width="30" height="30" rx="7" fill="#2563eb"/>
              <path d="M9 21V9l6 4.5L21 9v12l-6-4.5L9 21z" fill="#fff" opacity=".9"/>
            </svg>
            <h1>Добро пожаловать в Luminarix!</h1>
            <p>Ваш аккаунт в панели Pterodactyl создан</p>
          </div>
          <div class="content">
            <p>Здравствуйте!</p>
            <p>Вы успешно зарегистрировались в нашем хостинге. Для вас автоматически создана учётная запись в панели управления Pterodactyl. Используйте следующие данные для входа:</p>
            
            <div class="credentials">
              <div class="cred-item">
                <div class="cred-label">📧 Логин (email)</div>
                <div class="cred-value">${email}</div>
              </div>
              <div class="cred-item">
                <div class="cred-label">🔑 Пароль</div>
                <div class="cred-value">${pteroPassword}</div>
              </div>
            </div>
            
            <p style="text-align: center;">
              <a href="${PTERO_URL}" class="button">Перейти в панель управления</a>
            </p>
            
            <p style="font-size: 14px; color: #9aa8c7; margin-top: 30px;">⚠️ Рекомендуем сменить пароль после первого входа. Если вы не создавали аккаунт, проигнорируйте это письмо.</p>
          </div>
          <div class="footer">
            <p>© 2026 Luminarix. Все права защищены.</p>
            <p><a href="https://luminarix.fun/policy">Политика конфиденциальности</a> • <a href="https://luminarix.fun/offert">Публичная оферта</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
  await transporter.sendMail(mailOptions);
}

async function sendVerificationEmail(email, code) {
  if (!transporter) {
    console.error('[EMAIL] No transporter configured');
    return;
  }
  const mailOptions = {
    from: smtpConfig.from,
    to: email,
    subject: 'Подтверждение email — Luminarix',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', sans-serif; background-color: #0b0f1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: linear-gradient(145deg, #131927 0%, #0d1422 100%); border-radius: 24px; border: 1px solid #2a3346; overflow: hidden; }
          .header { background: #1e2a47; padding: 30px; text-align: center; border-bottom: 1px solid #2e3b55; }
          .header h1 { color: #fff; font-size: 28px; margin: 0; }
          .content { padding: 40px 30px; color: #e0e7ff; text-align: center; }
          .code { background: #0f1629; border: 2px dashed #3b5b9b; border-radius: 20px; padding: 20px; margin: 30px 0; font-size: 48px; font-weight: 800; letter-spacing: 10px; color: #fff; }
          .footer { background: #0c111e; padding: 25px; text-align: center; font-size: 14px; color: #5d6f94; border-top: 1px solid #1f2a3f; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Подтверждение регистрации</h1>
          </div>
          <div class="content">
            <p>Здравствуйте!</p>
            <p>Для завершения регистрации на Luminarix введите следующий код подтверждения:</p>
            <div class="code">${code}</div>
            <p>Код действителен в течение 15 минут.</p>
            <p>Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.</p>
          </div>
          <div class="footer">
            <p>© 2026 Luminarix. Все права защищены.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
  await transporter.sendMail(mailOptions);
}

async function sendResetPasswordEmail(email, code) {
  if (!transporter) {
    console.error('[EMAIL] No transporter configured');
    return;
  }
  const mailOptions = {
    from: smtpConfig.from,
    to: email,
    subject: 'Сброс пароля — Luminarix',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', sans-serif; background-color: #0b0f1a; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: linear-gradient(145deg, #131927 0%, #0d1422 100%); border-radius: 24px; border: 1px solid #2a3346; overflow: hidden; }
          .header { background: #1e2a47; padding: 30px; text-align: center; border-bottom: 1px solid #2e3b55; }
          .header h1 { color: #fff; font-size: 28px; margin: 0; }
          .content { padding: 40px 30px; color: #e0e7ff; text-align: center; }
          .code { background: #0f1629; border: 2px dashed #ef4444; border-radius: 20px; padding: 20px; margin: 30px 0; font-size: 48px; font-weight: 800; letter-spacing: 10px; color: #fff; }
          .footer { background: #0c111e; padding: 25px; text-align: center; font-size: 14px; color: #5d6f94; border-top: 1px solid #1f2a3f; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Сброс пароля</h1>
          </div>
          <div class="content">
            <p>Здравствуйте!</p>
            <p>Вы запросили сброс пароля для вашего аккаунта Luminarix. Ваш код для сброса:</p>
            <div class="code">${code}</div>
            <p>Введите этот код на сайте, чтобы установить новый пароль.</p>
            <p>Код действителен 15 минут. Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
          </div>
          <div class="footer">
            <p>© 2026 Luminarix. Все права защищены.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
  await transporter.sendMail(mailOptions);
}

async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET_KEY) return true;
  const response = await fetch(RECAPTCHA_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
  });
  const data = await response.json();
  return data.success;
}

async function updatePterodactylResources(serverId, ram, cores, disk) {
  const getUrl = `${PTERO_URL}/api/application/servers/${serverId}?include=allocations`;
  const getOpts = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PTERO_ADMIN_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  const getResponse = await fetch(getUrl, getOpts);
  if (!getResponse.ok) {
    const errorText = await getResponse.text();
    throw new Error(`Failed to fetch server details: ${getResponse.status} ${errorText}`);
  }
  const serverData = await getResponse.json();
  const attributes = serverData.attributes;
  const allocationId = attributes.allocation?.id || attributes.allocation;
  if (!allocationId) throw new Error('Allocation ID not found');
  const featureLimits = attributes.feature_limits || { databases: 1, backups: 1 };
  const cpu = cores * 100;
  const buildUrl = `${PTERO_URL}/api/application/servers/${serverId}/build`;
  const buildBody = {
    allocation: allocationId,
    memory: ram,
    swap: 0,
    disk: disk,
    io: 500,
    cpu: cpu,
    feature_limits: featureLimits
  };
  console.log('[PTERO] Updating server build with:', buildBody);
  const buildOpts = {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${PTERO_ADMIN_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(buildBody)
  };
  const buildResponse = await fetch(buildUrl, buildOpts);
  if (!buildResponse.ok) {
    const errorText = await buildResponse.text();
    throw new Error(`Pterodactyl error (${buildResponse.status}): ${errorText}`);
  }
  return buildResponse.json();
}

// ══════════════════════════════════════════════════
// DISCORD OAUTH2 ROUTES
// ══════════════════════════════════════════════════

app.get('/api/auth/discord', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('discord_oauth_state', state, { maxAge: 5 * 60 * 1000, httpOnly: true, secure: true, sameSite: 'lax' });
  
  const authorizeUrl = `${DISCORD_API_ENDPOINT}/oauth2/authorize?` + new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email',
    state: state,
  });
  res.redirect(authorizeUrl);
});

app.get('/api/auth/discord/callback', async (req, res) => {
  const { code, state } = req.query;
  const savedState = req.cookies?.discord_oauth_state;
  
  if (!state || state !== savedState) {
    return res.status(400).send('Invalid state parameter');
  }
  if (!code) {
    return res.status(400).send('Missing code');
  }

  try {
    const tokenResponse = await fetch(`${DISCORD_API_ENDPOINT}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to get token');
    }

    const userResponse = await fetch(`${DISCORD_API_ENDPOINT}/users/@me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userResponse.json();
    if (!userResponse.ok) {
      throw new Error(discordUser.message || 'Failed to get user info');
    }

    const discordId = discordUser.id;
    const email = discordUser.email;
    const username = discordUser.username + '#' + discordUser.discriminator;

    let user = db.prepare('SELECT * FROM users WHERE discordId = ?').get(discordId);
    
    if (!user) {
      user = email ? db.prepare('SELECT * FROM users WHERE email = ?').get(email) : null;
      
      if (user) {
        db.prepare('UPDATE users SET discordId = ? WHERE id = ?').run(discordId, user.id);
      } else {
        const userId = genId();
        const randomPassword = crypto.randomBytes(20).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        
        db.prepare(`
          INSERT INTO users (id, username, email, password, discordId, verified, role)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(userId, username, email || null, hashedPassword, discordId, 1, 'user');
        
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      }
    }

    const token = genId() + genId();
    db.prepare('INSERT INTO sessions (token, userId) VALUES (?,?)').run(token, user.id);

    res.redirect(`${FRONTEND_URL}/auth/discord/success?token=${token}`);
    
  } catch (error) {
    console.error('[DISCORD OAUTH] Error:', error);
    res.redirect(`${FRONTEND_URL}/auth/discord/error?message=${encodeURIComponent(error.message)}`);
  }
});

// ══════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════

app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { username, email, password, recaptchaToken } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Заполните все поля' });
  if (!validator.isEmail(email)) return res.status(400).json({ error: 'Некорректный email' });
  const usernameRegex = /^[a-zA-Zа-яА-Я0-9_.-]{3,30}$/;
  if (!usernameRegex.test(username)) return res.status(400).json({ error: 'Имя пользователя должно быть 3-30 символов и может содержать буквы, цифры, _, ., -' });
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!passwordRegex.test(password)) return res.status(400).json({ error: 'Пароль должен содержать минимум 8 символов, включая буквы и цифры' });
  if (RECAPTCHA_SECRET_KEY) {
    const isValid = await verifyRecaptcha(recaptchaToken);
    if (!isValid) return res.status(400).json({ error: 'Проверка reCAPTCHA не пройдена' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email.toLowerCase(), username);
  if (existing) return res.status(400).json({ error: 'Пользователь уже существует' });

  const id = genId();
  const hashedPassword = await bcrypt.hash(password, 10);
  
  db.prepare('INSERT INTO users (id, username, email, password, verified) VALUES (?,?,?,?,?)')
    .run(id, username, email.toLowerCase(), hashedPassword, 0);

  let pteroUserId = null;
  try {
    const result = await ensurePterodactylUser(email.toLowerCase(), username);
    if (result.pteroUserId) {
      pteroUserId = result.pteroUserId;
      db.prepare('UPDATE users SET pterodactylUserId = ? WHERE id = ?').run(pteroUserId, id);
    }
  } catch (pteroError) {
    console.error('[REGISTER] Failed to create Pterodactyl user:', pteroError);
  }

  const code = genCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO verification_codes (id, userId, code, type, expiresAt) VALUES (?,?,?,?,?)')
    .run(genId(), id, code, 'verify', expiresAt);

  try { await sendVerificationEmail(email, code); } catch (e) { console.error('[EMAIL] Failed to send verification code:', e); }

  res.json({ success: true, message: 'Регистрация успешна. Проверьте почту для подтверждения.' });
});

app.post('/api/auth/verify', authLimiter, (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Заполните все поля' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (user.verified) return res.status(400).json({ error: 'Аккаунт уже подтверждён' });
  const verification = db.prepare('SELECT * FROM verification_codes WHERE userId = ? AND code = ? AND type = ? AND used = 0 AND expiresAt > datetime(\'now\')')
    .get(user.id, code, 'verify');
  if (!verification) return res.status(400).json({ error: 'Неверный или истёкший код' });
  db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(verification.id);
  db.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(user.id);
  res.json({ success: true, message: 'Email подтверждён. Теперь вы можете войти.' });
});

app.post('/api/auth/forgot', authLimiter, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Введите email' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Пользователь с таким email не найден' });
  const code = genCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO verification_codes (id, userId, code, type, expiresAt) VALUES (?,?,?,?,?)')
    .run(genId(), user.id, code, 'reset', expiresAt);
  sendResetPasswordEmail(email, code).catch(e => console.error('[EMAIL] Failed to send reset code:', e));
  res.json({ success: true, message: 'Код для сброса пароля отправлен на почту.' });
});

app.post('/api/auth/reset', authLimiter, async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'Заполните все поля' });
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) return res.status(400).json({ error: 'Пароль должен содержать минимум 8 символов, включая буквы и цифры' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const verification = db.prepare('SELECT * FROM verification_codes WHERE userId = ? AND code = ? AND type = ? AND used = 0 AND expiresAt > datetime(\'now\')')
    .get(user.id, code, 'reset');
  if (!verification) return res.status(400).json({ error: 'Неверный или истёкший код' });
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);
  db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(verification.id);
  res.json({ success: true, message: 'Пароль успешно изменён. Теперь вы можете войти.' });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password, recaptchaToken } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Заполните все поля' });
  if (RECAPTCHA_SECRET_KEY) {
    const isValid = await verifyRecaptcha(recaptchaToken);
    if (!isValid) return res.status(400).json({ error: 'Проверка reCAPTCHA не пройдена' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(400).json({ error: 'Неверная почта или пароль' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Неверная почта или пароль' });
  if (user.blocked) return res.status(403).json({ error: 'Аккаунт заблокирован' });
  if (!user.verified) return res.status(403).json({ error: 'Аккаунт не подтверждён. Проверьте почту.' });

  if (user.twoFactorEnabled) {
    const tempToken = genId() + genId();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO temp_tokens (token, userId, expiresAt) VALUES (?,?,?)').run(tempToken, user.id, expiresAt);
    return res.json({ require2FA: true, tempToken });
  }

  const token = genId() + genId();
  db.prepare('INSERT INTO sessions (token, userId) VALUES (?,?)').run(token, user.id);
  res.json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/2fa/verify-login', authLimiter, (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) return res.status(400).json({ error: 'Заполните все поля' });
  const temp = db.prepare('SELECT * FROM temp_tokens WHERE token = ? AND expiresAt > datetime(\'now\')').get(tempToken);
  if (!temp) return res.status(400).json({ error: 'Временный токен истёк или недействителен' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(temp.userId);
  if (!user || !user.twoFactorEnabled) return res.status(400).json({ error: '2FA не включена' });
  const verified = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: code });
  if (!verified) return res.status(400).json({ error: 'Неверный код' });
  db.prepare('DELETE FROM temp_tokens WHERE token = ?').run(tempToken);
  const token = genId() + genId();
  db.prepare('INSERT INTO sessions (token, userId) VALUES (?,?)').run(token, user.id);
  res.json({ token, user: sanitizeUser(user) });
});

app.get('/api/auth/2fa/status', authMiddleware, (req, res) => {
  res.json({ enabled: !!req.user.twoFactorEnabled });
});

app.post('/api/auth/2fa/enable', authMiddleware, (req, res) => {
  if (req.user.twoFactorEnabled) return res.status(400).json({ error: '2FA уже включена' });
  const secret = speakeasy.generateSecret({ length: 20 });
  const otpauth = `otpauth://totp/Luminarix:${encodeURIComponent(req.user.email)}?secret=${secret.base32}&issuer=Luminarix`;
  db.prepare('UPDATE users SET twoFactorSecret = ? WHERE id = ?').run(secret.base32, req.user.id);
  res.json({ secret: secret.base32, otpauth_url: otpauth });
});

app.post('/api/auth/2fa/verify', authMiddleware, (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Введите код' });
  const secret = req.user.twoFactorSecret;
  if (!secret) return res.status(400).json({ error: 'Секрет не найден. Сначала запросите enable.' });
  const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token });
  if (!verified) return res.status(400).json({ error: 'Неверный код' });
  db.prepare('UPDATE users SET twoFactorEnabled = 1 WHERE id = ?').run(req.user.id);
  res.json({ success: true });
});

app.post('/api/auth/2fa/disable', authMiddleware, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Введите пароль' });
  const match = await bcrypt.compare(password, req.user.password);
  if (!match) return res.status(400).json({ error: 'Неверный пароль' });
  db.prepare('UPDATE users SET twoFactorSecret = NULL, twoFactorEnabled = 0 WHERE id = ?').run(req.user.id);
  res.json({ success: true });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.json({ success: true });
});

function sanitizeUser(u) {
  return {
    id: u.id, username: u.username, email: u.email,
    balance: u.balance, role: u.role, blocked: !!u.blocked,
    isAdmin: u.role === 'admin', createdAt: u.createdAt,
    pterodactylUserId: u.pterodactylUserId,
    verified: !!u.verified,
    twoFactorEnabled: !!u.twoFactorEnabled,
    discordId: u.discordId,
  };
}

// ══════════════════════════════════════════════════
// USER PROFILE
// ══════════════════════════════════════════════════
app.put('/api/auth/profile', authMiddleware, (req, res) => {
  const { username, email } = req.body;
  if (username) {
    const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id);
    if (dup) return res.status(400).json({ error: 'Имя занято' });
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, req.user.id);
  }
  if (email) {
    const dup = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.toLowerCase(), req.user.id);
    if (dup) return res.status(400).json({ error: 'Почта занята' });
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email.toLowerCase(), req.user.id);
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: sanitizeUser(user) });
});

app.put('/api/auth/password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const match = await bcrypt.compare(currentPassword, req.user.password);
  if (!match) return res.status(400).json({ error: 'Неверный текущий пароль' });
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) return res.status(400).json({ error: 'Пароль должен содержать минимум 8 символов, включая буквы и цифры' });
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════
// PLANS
// ══════════════════════════════════════════════════
app.get('/api/plans', (_req, res) => {
  const plans = db.prepare('SELECT * FROM plans ORDER BY sortOrder ASC, price ASC').all();
  res.json(plans.map(p => ({ ...p, features: JSON.parse(p.features || '[]'), popular: !!p.popular })));
});

app.post('/api/plans', authMiddleware, adminMiddleware, (req, res) => {
  const { name, tier, price, ram, cores, disk, features, popular, icon, description } = req.body;
  if (!name || !tier || !price || !ram || !cores || !disk) return res.status(400).json({ error: 'Заполните обязательные поля' });
  const id = 'plan_' + genId();
  const maxOrder = db.prepare('SELECT MAX(sortOrder) as m FROM plans').get();
  db.prepare('INSERT INTO plans (id,name,tier,price,ram,cores,disk,features,popular,icon,description,sortOrder) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
    id, name, tier, price, ram, cores, disk, JSON.stringify(features || []), popular ? 1 : 0, icon || 'fa-cube', description || '', (maxOrder?.m || 0) + 1
  );
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
  res.json({ ...plan, features: JSON.parse(plan.features || '[]'), popular: !!plan.popular });
});

app.put('/api/plans/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { name, tier, price, ram, cores, disk, features, popular, icon, description } = req.body;
  db.prepare('UPDATE plans SET name=?,tier=?,price=?,ram=?,cores=?,disk=?,features=?,popular=?,icon=?,description=? WHERE id=?').run(
    name, tier, price, ram, cores, disk, JSON.stringify(features || []), popular ? 1 : 0, icon || 'fa-cube', description || '', req.params.id
  );
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Тариф не найден' });
  res.json({ ...plan, features: JSON.parse(plan.features || '[]'), popular: !!plan.popular });
});

app.delete('/api/plans/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM plans WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════
// SERVERS
// ══════════════════════════════════════════════════
app.get('/api/servers', authMiddleware, (req, res) => {
  let servers;
  if (req.user.role === 'admin' || req.user.role === 'support') {
    servers = db.prepare('SELECT * FROM servers ORDER BY createdAt DESC').all();
  } else {
    servers = db.prepare('SELECT * FROM servers WHERE userId = ? ORDER BY createdAt DESC').all(req.user.id);
  }
  res.json(servers);
});

app.get('/api/servers/:id', authMiddleware, (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Сервер не найден' });
  if (server.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Нет доступа' });
  res.json(server);
});

app.post('/api/servers', authMiddleware, (req, res) => {
  try {
    const { name, tariffId, tariffName, tariffTier, coreName, ram, cores, disk, price, months, expiresAt, ip, port, node, pterodactylServerId, pterodactylIdentifier, pterodactylUuid } = req.body;
    const cost = price * (months || 1);
    if (req.user.role !== 'admin') {
      if (req.user.balance < cost) return res.status(400).json({ error: 'Недостаточно средств для создания сервера' });
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(cost, req.user.id);
      req.user.balance -= cost;
    }
    const id = genId();
    db.prepare(`INSERT INTO servers (id,userId,name,tariffId,tariffName,tariffTier,coreName,status,ram,cores,disk,price,months,expiresAt,ip,port,node,pterodactylServerId,pterodactylIdentifier,pterodactylUuid) 
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, req.user.id, name, tariffId, tariffName, tariffTier, coreName, 'active', ram, cores, disk, price, months, expiresAt, ip || null, port || null, node || null, pterodactylServerId || null, pterodactylIdentifier || null, pterodactylUuid || null
    );
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(id);
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ server, user: sanitizeUser(updatedUser) });
  } catch (error) {
    console.error('[POST /api/servers] Error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.put('/api/servers/:id', authMiddleware, (req, res) => {
  try {
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
    if (!server) return res.status(404).json({ error: 'Сервер не найден' });
    if (server.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Нет доступа' });
    const allowedFields = [
      'name', 'tariffId', 'tariffName', 'tariffTier', 'coreName',
      'ram', 'cores', 'disk', 'price', 'status', 'expiresAt',
      'ip', 'port', 'node', 'pterodactylServerId', 'pterodactylIdentifier',
      'pterodactylUuid', 'autoRenew'
    ];
    const updates = [];
    const values = [];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];
        if (field === 'autoRenew' && typeof value === 'boolean') value = value ? 1 : 0;
        updates.push(`${field} = ?`);
        values.push(value);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Нет полей для обновления' });
    values.push(req.params.id);
    const query = `UPDATE servers SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);
    const updated = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
    if (updated && updated.autoRenew !== undefined) updated.autoRenew = !!updated.autoRenew;
    res.json(updated);
  } catch (error) {
    console.error('[PUT /api/servers/:id] Error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.delete('/api/servers/:id', authMiddleware, async (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Сервер не найден' });
  if (server.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Нет доступа' });
  if (server.pterodactylServerId) {
    try {
      await ptero('DELETE', `/servers/${server.pterodactylServerId}/force`).catch(async () => {
        await ptero('DELETE', `/servers/${server.pterodactylServerId}`);
      });
    } catch (pteroError) {
      console.error('[PTERO] Failed to delete server:', pteroError);
      return res.status(500).json({ error: 'Не удалось удалить сервер в Pterodactyl' });
    }
  }
  db.prepare('DELETE FROM servers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/servers/:id/renew', authMiddleware, (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Сервер не найден' });
  if (server.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Нет доступа' });
  const { months } = req.body;
  const cost = server.price * (months || 1);
  if (req.user.role !== 'admin') {
    if (req.user.balance < cost) return res.status(400).json({ error: 'Недостаточно средств' });
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(cost, req.user.id);
  }
  const exp = new Date(Math.max(new Date(server.expiresAt).getTime(), Date.now()));
  exp.setMonth(exp.getMonth() + (months || 1));
  db.prepare('UPDATE servers SET expiresAt = ?, status = ? WHERE id = ?').run(exp.toISOString(), 'active', req.params.id);
  const updated = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ server: updated, user: sanitizeUser(user) });
});

app.post('/api/servers/:id/change-tariff', authMiddleware, async (req, res) => {
  try {
    const { tariffId } = req.body;
    if (!tariffId) return res.status(400).json({ error: 'Не указан тариф' });
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
    if (!server) return res.status(404).json({ error: 'Сервер не найден' });
    if (server.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Нет доступа' });
    const oldTariffPrice = server.price;
    const newTariff = db.prepare('SELECT * FROM plans WHERE id = ?').get(tariffId);
    if (!newTariff) return res.status(404).json({ error: 'Тариф не найден' });
    const now = Date.now();
    const expires = new Date(server.expiresAt).getTime();
    const daysLeft = Math.max(0, Math.ceil((expires - now) / 86400000));
    const monthDays = 30;
    const oldPricePerDay = oldTariffPrice / monthDays;
    const newPricePerDay = newTariff.price / monthDays;
    const costDiff = (newPricePerDay - oldPricePerDay) * daysLeft;
    if (req.user.role !== 'admin') {
      const userBalance = req.user.balance;
      if (costDiff > 0 && userBalance < costDiff) return res.status(400).json({ error: 'Недостаточно средств для смены тарифа' });
    }
    if (server.pterodactylServerId) {
      try {
        await updatePterodactylResources(server.pterodactylServerId, newTariff.ram, newTariff.cores, newTariff.disk);
      } catch (pteroError) {
        console.error('[PTERO] Failed to update server resources:', pteroError);
        return res.status(500).json({ error: 'Не удалось обновить ресурсы в Pterodactyl: ' + pteroError.message });
      }
    }
    if (req.user.role !== 'admin' && Math.abs(costDiff) > 0.01) {
      const newBalance = req.user.balance - costDiff;
      db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, req.user.id);
      req.user.balance = newBalance;
    }
    db.prepare(`
      UPDATE servers SET
        tariffId = ?,
        tariffName = ?,
        tariffTier = ?,
        ram = ?,
        cores = ?,
        disk = ?,
        price = ?
      WHERE id = ?
    `).run(
      newTariff.id,
      newTariff.name,
      newTariff.tier,
      newTariff.ram,
      newTariff.cores,
      newTariff.disk,
      newTariff.price,
      server.id
    );
    const updatedServer = db.prepare('SELECT * FROM servers WHERE id = ?').get(server.id);
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ server: updatedServer, user: sanitizeUser(updatedUser) });
  } catch (error) {
    console.error('[POST /api/servers/:id/change-tariff] Error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ══════════════════════════════════════════════════
// TICKETS (с cooldown и админским удалением)
// ══════════════════════════════════════════════════
app.get('/api/tickets', authMiddleware, (req, res) => {
  let tickets;
  if (req.user.role === 'admin' || req.user.role === 'support') {
    tickets = db.prepare('SELECT * FROM tickets ORDER BY createdAt DESC').all();
  } else {
    tickets = db.prepare('SELECT * FROM tickets WHERE userId = ? ORDER BY createdAt DESC').all(req.user.id);
  }
  const getMessages = db.prepare('SELECT * FROM ticket_messages WHERE ticketId = ? ORDER BY createdAt ASC');
  tickets = tickets.map(t => ({ ...t, messages: getMessages.all(t.id).map(m => ({ ...m, isStaff: !!m.isStaff })) }));
  res.json(tickets);
});

app.post('/api/tickets', authMiddleware, (req, res) => {
  const { subject, category, message } = req.body;
  if (!subject || !message) return res.status(400).json({ error: 'Заполните все поля' });

  const now = Date.now();
  const lastTicket = req.user.lastTicketAt ? new Date(req.user.lastTicketAt).getTime() : 0;
  const diff = now - lastTicket;
  const cooldownMs = 15 * 60 * 1000;
  if (diff < cooldownMs) {
    const remainingMs = cooldownMs - diff;
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return res.status(429).json({ error: `Вы можете создать новый тикет через ${remainingMinutes} мин.` });
  }

  const ticketId = genId();
  const msgId = genId();
  db.prepare('INSERT INTO tickets (id, userId, username, subject, category) VALUES (?,?,?,?,?)').run(
    ticketId, req.user.id, req.user.username, subject, category || 'Другое'
  );
  db.prepare('INSERT INTO ticket_messages (id, ticketId, authorId, authorName, isStaff, content) VALUES (?,?,?,?,?,?)').run(
    msgId, ticketId, req.user.id, req.user.username, 0, message
  );

  db.prepare('UPDATE users SET lastTicketAt = ? WHERE id = ?').run(new Date().toISOString(), req.user.id);

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  const messages = db.prepare('SELECT * FROM ticket_messages WHERE ticketId = ?').all(ticketId);
  res.json({ ...ticket, messages: messages.map(m => ({ ...m, isStaff: !!m.isStaff })) });
});

app.post('/api/tickets/:id/messages', authMiddleware, (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Тикет не найден' });
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Введите сообщение' });
  const isStaff = req.user.role === 'admin' || req.user.role === 'support';
  db.prepare('INSERT INTO ticket_messages (id, ticketId, authorId, authorName, isStaff, content) VALUES (?,?,?,?,?,?)').run(
    genId(), req.params.id, req.user.id, req.user.username, isStaff ? 1 : 0, content
  );
  db.prepare('UPDATE tickets SET status = ? WHERE id = ?').run(isStaff ? 'answered' : 'open', req.params.id);
  const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  const messages = db.prepare('SELECT * FROM ticket_messages WHERE ticketId = ?').all(req.params.id);
  res.json({ ...updated, messages: messages.map(m => ({ ...m, isStaff: !!m.isStaff })) });
});

app.put('/api/tickets/:id', authMiddleware, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE tickets SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/tickets/:id', authMiddleware, adminMiddleware, (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Тикет не найден' });
  db.prepare('DELETE FROM ticket_messages WHERE ticketId = ?').run(req.params.id);
  db.prepare('DELETE FROM tickets WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/tickets', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM ticket_messages').run();
  db.prepare('DELETE FROM tickets').run();
  res.json({ success: true });
});

// ══════════════════════════════════════════════════
// REVIEWS
// ══════════════════════════════════════════════════

app.get('/api/reviews', (req, res) => {
  const { limit = 10 } = req.query;
  const reviews = db.prepare(`
    SELECT id, userName, rating, text, createdAt 
    FROM reviews 
    ORDER BY createdAt DESC 
    LIMIT ?
  `).all(Number(limit));
  res.json(reviews);
});

app.post('/api/reviews', authMiddleware, (req, res) => {
  const { rating, text } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
  if (!text || text.trim().length < 3) return res.status(400).json({ error: 'Текст отзыва должен содержать минимум 3 символа' });

  const serverCount = db.prepare('SELECT COUNT(*) as count FROM servers WHERE userId = ?').get(req.user.id).count;
  if (serverCount === 0) return res.status(403).json({ error: 'Только клиенты с серверами могут оставлять отзывы' });

  const existing = db.prepare('SELECT id FROM reviews WHERE userId = ?').get(req.user.id);
  if (existing) return res.status(400).json({ error: 'Вы уже оставили отзыв. Редактирование пока не поддерживается.' });

  const id = genId();
  db.prepare(`
    INSERT INTO reviews (id, userId, userName, rating, text)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.user.id, req.user.username, rating, text.trim());

  const newReview = db.prepare('SELECT id, userName, rating, text, createdAt FROM reviews WHERE id = ?').get(id);
  res.json(newReview);
});

app.get('/api/user/reviews', authMiddleware, (req, res) => {
  const reviews = db.prepare(`
    SELECT id, rating, text, createdAt 
    FROM reviews 
    WHERE userId = ?
    ORDER BY createdAt DESC
  `).all(req.user.id);
  res.json(reviews);
});

app.delete('/api/admin/reviews/:id', authMiddleware, adminMiddleware, (req, res) => {
  const review = db.prepare('SELECT id FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Отзыв не найден' });
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/reviews', authMiddleware, adminMiddleware, (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, u.email 
    FROM reviews r
    JOIN users u ON u.id = r.userId
    ORDER BY r.createdAt DESC
  `).all();
  res.json(reviews);
});

// ══════════════════════════════════════════════════
// ADMIN: Users
// ══════════════════════════════════════════════════
app.get('/api/admin/users', authMiddleware, adminMiddleware, (_req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY createdAt DESC').all();
  res.json(users.map(sanitizeUser));
});

app.put('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { username, email, password, balance, role, blocked, twoFactorEnabled } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const updates = [];
  const values = [];

  if (username !== undefined) {
    const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.params.id);
    if (dup) return res.status(400).json({ error: 'Имя пользователя уже занято' });
    updates.push('username = ?');
    values.push(username);
  }
  if (email !== undefined) {
    const dup = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.toLowerCase(), req.params.id);
    if (dup) return res.status(400).json({ error: 'Email уже занят' });
    updates.push('email = ?');
    values.push(email.toLowerCase());
  }
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updates.push('password = ?');
    values.push(hashedPassword);
  }
  if (balance !== undefined) {
    updates.push('balance = ?');
    values.push(parseFloat(balance));
  }
  if (role !== undefined) {
    updates.push('role = ?');
    values.push(role);
  }
  if (blocked !== undefined) {
    updates.push('blocked = ?');
    values.push(blocked ? 1 : 0);
  }

  if (twoFactorEnabled !== undefined && twoFactorEnabled === false) {
    updates.push('twoFactorSecret = NULL, twoFactorEnabled = 0');
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Нет полей для обновления' });

  values.push(req.params.id);
  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  try {
    db.prepare(query).run(...values);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json(sanitizeUser(updated));
  } catch (error) {
    console.error('[PUT /api/admin/users/:id] Error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении пользователя' });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ADMIN: Servers
app.get('/api/admin/servers', authMiddleware, adminMiddleware, (_req, res) => {
  const servers = db.prepare('SELECT * FROM servers ORDER BY createdAt DESC').all();
  res.json(servers);
});

app.put('/api/admin/servers/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Сервер не найден' });
  const allowedFields = [
    'name', 'tariffId', 'tariffName', 'tariffTier', 'ram', 'cores', 'disk',
    'price', 'status', 'expiresAt', 'ip', 'port', 'pterodactylServerId',
    'pterodactylIdentifier', 'pterodactylUuid', 'node', 'autoRenew'
  ];
  const updates = [];
  const values = [];
  let shouldUpdatePtero = false;
  let newRam = server.ram;
  let newCores = server.cores;
  let newDisk = server.disk;
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      let value = req.body[field];
      if (field === 'autoRenew' && typeof value === 'boolean') value = value ? 1 : 0;
      updates.push(`${field} = ?`);
      values.push(value);
      if (field === 'ram') newRam = value;
      if (field === 'cores') newCores = value;
      if (field === 'disk') newDisk = value;
    }
  }
  const resourcesChanged = (newRam !== server.ram || newCores !== server.cores || newDisk !== server.disk);
  if (resourcesChanged && server.pterodactylServerId) shouldUpdatePtero = true;
  if (shouldUpdatePtero) {
    try {
      await updatePterodactylResources(server.pterodactylServerId, newRam, newCores, newDisk);
    } catch (pteroError) {
      console.error('[PTERO] Failed to update server resources in admin edit:', pteroError);
      return res.status(500).json({ error: 'Не удалось обновить ресурсы в Pterodactyl: ' + pteroError.message });
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Нет полей для обновления' });
  values.push(req.params.id);
  const query = `UPDATE servers SET ${updates.join(', ')} WHERE id = ?`;
  try {
    db.prepare(query).run(...values);
    const updated = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
    if (updated && updated.autoRenew !== undefined) updated.autoRenew = !!updated.autoRenew;
    res.json(updated);
  } catch (error) {
    console.error('[PUT /api/admin/servers/:id] Error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении сервера' });
  }
});

app.delete('/api/admin/servers/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM servers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════
// TOP UP (Balance)
// ══════════════════════════════════════════════════
app.post('/api/topup', authMiddleware, (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Неверная сумма' });
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: sanitizeUser(user) });
});

// ══════════════════════════════════════════════════
// TRANSACTIONS (история пополнений)
// ══════════════════════════════════════════════════
app.get('/api/transactions', authMiddleware, (req, res) => {
  const transactions = db.prepare(`
    SELECT id, userId, operation_id, amount, status, created_at 
    FROM transactions 
    WHERE userId = ? 
    ORDER BY created_at DESC
  `).all(req.user.id);
  res.json(transactions);
});

// ══════════════════════════════════════════════════
// YooMoney Callback
// ══════════════════════════════════════════════════
app.post('/api/yoomoney/callback', express.urlencoded({ extended: true }), (req, res) => {
  const params = req.body;
  console.log('[YOOMONEY] Callback received:', params);
  const isTest = params.test_notification === 'true' || params.test_notification === true || params.test_notification === '1';
  if (isTest) {
    console.log('[YOOMONEY] Test notification received — ignoring');
    return res.status(200).send('OK');
  }
  const required = ['notification_type', 'operation_id', 'amount', 'currency', 'datetime', 'sender', 'codepro', 'sha1_hash'];
  for (const p of required) {
    if (!params.hasOwnProperty(p)) {
      console.log('[YOOMONEY] Missing param:', p);
      return res.status(400).send('Missing parameter');
    }
  }
  const secret = process.env.YOOMONEY_SECRET;
  if (!secret) {
    console.error('[YOOMONEY] Secret not configured');
    return res.status(500).send('Server configuration error');
  }
  const hashStr = [
    params.notification_type,
    params.operation_id,
    params.amount,
    params.currency,
    params.datetime,
    params.sender || '',
    params.codepro,
    secret,
    params.label || ''
  ].join('&');
  const calculatedHash = crypto.createHash('sha1').update(hashStr).digest('hex');
  if (calculatedHash !== params.sha1_hash) {
    console.log('[YOOMONEY] Invalid hash!');
    console.log(`[YOOMONEY] Expected: ${calculatedHash}, got: ${params.sha1_hash}`);
    return res.status(400).send('Invalid hash');
  }
  const label = params.label || '';
  if (!label.startsWith('lmx_')) {
    console.log('[YOOMONEY] Invalid label format:', label);
    return res.status(400).send('Invalid label');
  }
  const parts = label.split('_');
  if (parts.length < 2) return res.status(400).send('Invalid label');
  const userId = parts[1];
  const existing = db.prepare('SELECT id FROM transactions WHERE operation_id = ?').get(params.operation_id);
  if (existing) {
    console.log('[YOOMONEY] Operation already processed:', params.operation_id);
    return res.status(200).send('OK');
  }
  const amount = parseFloat(params.amount);
  if (isNaN(amount) || amount <= 0) {
    console.log('[YOOMONEY] Invalid amount:', params.amount);
    return res.status(400).send('Invalid amount');
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    console.log('[YOOMONEY] User not found:', userId);
    return res.status(400).send('User not found');
  }
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, userId);
  const transactionId = 'txn_' + genId();
  db.prepare('INSERT INTO transactions (id, userId, operation_id, amount) VALUES (?, ?, ?, ?)')
    .run(transactionId, userId, params.operation_id, amount);
  console.log(`[YOOMONEY] SUCCESS: Added ${amount} to user ${userId} (operation: ${params.operation_id})`);
  res.status(200).send('OK');
});

// ══════════════════════════════════════════════════
// PTERODACTYL API PROXY
// ══════════════════════════════════════════════════
app.get('/api/ptero/test', async (_req, res) => {
  try {
    const data = await ptero('GET', '/servers?per_page=1');
    res.json({ success: true, total_servers: data.meta?.pagination?.total ?? 0, panel_url: PTERO_URL });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/ptero/servers', authMiddleware, adminMiddleware, async (_req, res) => {
  try { res.json(await ptero('GET', '/servers?include=allocations,user&per_page=100')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ptero/users', authMiddleware, adminMiddleware, async (_req, res) => {
  try { res.json(await ptero('GET', '/users?per_page=100')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ptero/servers/:id/suspend', authMiddleware, adminMiddleware, async (req, res) => {
  try { await ptero('POST', `/servers/${req.params.id}/suspend`); res.json({ success: true }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.post('/api/ptero/servers/:id/unsuspend', authMiddleware, adminMiddleware, async (req, res) => {
  try { await ptero('POST', `/servers/${req.params.id}/unsuspend`); res.json({ success: true }); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.delete('/api/ptero/servers/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try { await ptero('DELETE', `/servers/${req.params.id}/force`); res.json({ success: true }); }
  catch { try { await ptero('DELETE', `/servers/${req.params.id}`); res.json({ success: true }); } catch (e2) { res.status(500).json({ error: e2.message }); } }
});

// ========== ЭНДПОИНТ PROVISION ==========
app.post('/api/ptero/provision', authMiddleware, async (req, res) => {
  const { email, username, serverName, ram, disk, cpu, coreName } = req.body;
  console.log(`\n[PROVISION] === НАЧАЛО СОЗДАНИЯ СЕРВЕРА ===`);
  console.log(`[PROVISION] Email: ${email}, Username: ${username}, Server: ${serverName}`);
  console.log(`[PROVISION] Ядро: ${coreName || 'не указано'}, RAM: ${ram} MB, CPU: ${cpu} cores, Disk: ${disk} MB`);
  const effectiveCore = coreName || 'paper';
  try {
    let pteroUserId;
    try {
      const existing = await ptero('GET', `/users?filter[email]=${encodeURIComponent(email)}`);
      if (existing.data?.length > 0) {
        pteroUserId = existing.data[0].attributes.id;
        console.log(`[PROVISION] Using existing Pterodactyl user ${pteroUserId}`);
      }
    } catch { /* ignore */ }

    if (!pteroUserId) {
      const safeName = (username || 'user').replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 28) || 'user';
      const password = genPassword();
      const newUser = await ptero('POST', '/users', {
        email,
        username: safeName + '_' + Math.floor(Math.random() * 10000),
        first_name: username || 'User',
        last_name: 'Luminarix',
        password,
      });
      pteroUserId = newUser.attributes.id;

      try {
        await sendPterodactylCredentials(email, safeName, password);
        console.log(`[PROVISION] Credentials email sent to ${email}`);
      } catch (emailError) {
        console.error('[PROVISION] Failed to send credentials email:', emailError);
      }
    }

    const nodes = await ptero('GET', '/nodes');
    if (!nodes.data?.length) throw new Error('Нет доступных нод');
    let freeAlloc = null, nodeId = null;
    for (const node of nodes.data) {
      const allocs = await ptero('GET', `/nodes/${node.attributes.id}/allocations?per_page=500`);
      const free = allocs.data?.find(a => !a.attributes.assigned);
      if (free) {
        freeAlloc = free.attributes;
        nodeId = node.attributes.id;
        break;
      }
    }
    if (!freeAlloc) throw new Error('Нет свободных аллокаций');
    const nests = await ptero('GET', '/nests');
    const proxyKeywords = ['bungee', 'velocity', 'waterfall', 'proxy', 'bungeecord'];
    let eggId = null;
    let dockerImage = 'ghcr.io/pterodactyl/yolks:java_17';
    let startup = 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}';
    let env = { SERVER_JARFILE: 'server.jar', VANILLA_VERSION: 'latest' };
    const getEggName = (egg) => egg?.attributes?.name;
    for (const nest of (nests.data || [])) {
      try {
        const eggs = await ptero('GET', `/nests/${nest.attributes.id}/eggs?include=variables`);
        const candidate = eggs.data?.find(e => {
          const name = getEggName(e);
          if (!name) return false;
          const nameLower = name.toLowerCase();
          const hasCore = nameLower.includes(effectiveCore.toLowerCase());
          const isProxy = proxyKeywords.some(k => nameLower.includes(k));
          return hasCore && !isProxy;
        });
        if (candidate) {
          eggId = candidate.attributes.id;
          dockerImage = candidate.attributes.docker_image;
          startup = candidate.attributes.startup;
          if (candidate.attributes.relationships?.variables?.data) {
            env = {};
            candidate.attributes.relationships.variables.data.forEach(v => {
              env[v.attributes.env_variable] = v.attributes.default_value || '';
            });
          }
          break;
        }
      } catch { /* ignore */ }
    }
    if (!eggId) {
      for (const nest of (nests.data || [])) {
        try {
          const eggs = await ptero('GET', `/nests/${nest.attributes.id}/eggs?include=variables`);
          const match = eggs.data?.find(e => {
            const name = getEggName(e);
            return name && name.toLowerCase().includes(effectiveCore.toLowerCase());
          });
          if (match) {
            eggId = match.attributes.id;
            dockerImage = match.attributes.docker_image;
            startup = match.attributes.startup;
            if (match.attributes.relationships?.variables?.data) {
              env = {};
              match.attributes.relationships.variables.data.forEach(v => {
                env[v.attributes.env_variable] = v.attributes.default_value || '';
              });
            }
            break;
          }
        } catch { /* ignore */ }
      }
    }
    if (!eggId) {
      for (const nest of (nests.data || [])) {
        try {
          const eggs = await ptero('GET', `/nests/${nest.attributes.id}/eggs?include=variables`);
          if (eggs.data?.length) {
            const e = eggs.data[0];
            eggId = e.attributes.id;
            dockerImage = e.attributes.docker_image;
            startup = e.attributes.startup;
            if (e.attributes.relationships?.variables?.data) {
              env = {};
              e.attributes.relationships.variables.data.forEach(v => {
                env[v.attributes.env_variable] = v.attributes.default_value || '';
              });
            }
            break;
          }
        } catch { /* ignore */ }
      }
    }
    if (!eggId) throw new Error('Нет доступных яиц (eggs)');
    const created = await ptero('POST', '/servers', {
      name: serverName,
      user: pteroUserId,
      egg: eggId,
      docker_image: dockerImage,
      startup,
      environment: env,
      limits: { memory: ram, swap: 0, disk, io: 500, cpu: cpu * 100 },
      feature_limits: { databases: 5, backups: 5, allocations: 5 },
      allocation: { default: freeAlloc.id },
    });
    db.prepare('UPDATE users SET pterodactylUserId = ? WHERE email = ?').run(pteroUserId, email);
    res.json({
      success: true,
      pterodactylUserId: pteroUserId,
      server: {
        id: created.attributes.id,
        identifier: created.attributes.identifier,
        uuid: created.attributes.uuid,
        name: created.attributes.name,
        node: nodeId,
        ip: freeAlloc.ip,
        port: freeAlloc.port
      },
    });
  } catch (e) {
    console.error(`[PROVISION] FAILED:`, e);
    let errorMessage = e.message;
    if (e.message.includes('аутентификации')) {
      errorMessage = 'Ошибка авторизации в Pterodactyl. Проверьте API-ключ.';
    } else if (e.message.includes('таймаут')) {
      errorMessage = 'Панель Pterodactyl не отвечает. Попробуйте позже или проверьте её доступность.';
    } else if (e.message.includes('Не удалось обновить ресурсы')) {
      errorMessage = e.message;
    }
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// ══════════════════════════════════════════════════
// STATUS PAGE API (для отображения состояния инфраструктуры)
// ══════════════════════════════════════════════════
app.get('/api/status', async (req, res) => {
  try {
    const siteStatus = { online: true, message: 'Сайт работает' };

    let panelStatus = { online: false, message: 'Не удалось подключиться' };
    let nodes = [];
    try {
      const nodesData = await ptero('GET', '/nodes?per_page=100');
      panelStatus = { online: true, message: 'Панель доступна' };

      nodes = await Promise.all(nodesData.data.map(async (node) => {
        const attr = node.attributes;
        return {
          id: attr.id,
          name: attr.name,
          description: attr.description,
          location_id: attr.location_id,
          public: attr.public,
          maintenance_mode: attr.maintenance_mode,
          memory: attr.memory,
          memory_overallocate: attr.memory_overallocate,
          disk: attr.disk,
          disk_overallocate: attr.disk_overallocate,
          servers_count: attr.servers_count,
          created_at: attr.created_at,
          updated_at: attr.updated_at,
          status: attr.maintenance_mode ? 'maintenance' : 'active'
        };
      }));
    } catch (error) {
      panelStatus = { online: false, message: error.message || 'Ошибка подключения к Pterodactyl' };
    }

    res.json({
      site: siteStatus,
      panel: panelStatus,
      nodes: nodes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[STATUS] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ══════════════════════════════════════════════════
// STATIC + SPA FALLBACK
// ══════════════════════════════════════════════════
const distDir = path.resolve(__dirname, 'dist');
const indexFile = path.resolve(distDir, 'index.html');

const publicDir = path.join(__dirname, 'public');
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  console.log('[STATIC] Serving public folder:', publicDir);
}

if (!existsSync(indexFile)) {
  console.warn(`[WARN] ${indexFile} not found! Run "npm run build" first.`);
}

app.use(express.static(distDir));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (req.path.includes('.')) return next();
  res.sendFile(indexFile);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`🚀 Luminarix запущен: http://localhost:${PORT}`);
  console.log(`📡 Pterodactyl: ${PTERO_URL}`);
  console.log(`🗄️  SQLite: luminarix.db`);
  console.log(`📝 Логи записываются в access.log`);
  console.log(`═══════════════════════════════════════════\n`);
});