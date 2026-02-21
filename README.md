# 🚀 Инструкция по развёртыванию Luminarix на VDS

## 📋 Требования

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| ОС | Ubuntu 20.04+ / Debian 11+ | Ubuntu 22.04 LTS |
| RAM | 512 МБ | 1 ГБ+ |
| CPU | 1 vCPU | 2 vCPU |
| Диск | 5 ГБ | 10 ГБ |
| Node.js | 18.x | 20.x LTS |
| Доступ | root или sudo | root |

---

## 📖 Содержание

1. [Подготовка сервера](#1-подготовка-сервера)
2. [Установка Node.js](#2-установка-nodejs)
3. [Загрузка проекта](#3-загрузка-проекта)
4. [Установка зависимостей и сборка](#4-установка-зависимостей-и-сборка)
5. [Настройка Pterodactyl API](#5-настройка-pterodactyl-api)
6. [Запуск сервера](#6-запуск-сервера)
7. [Настройка автозапуска (systemd)](#7-настройка-автозапуска-systemd)
8. [Настройка Nginx (домен + SSL)](#8-настройка-nginx-домен--ssl)
9. [Настройка домена](#9-настройка-домена)
10. [Проверка работы](#10-проверка-работы)
11. [Обновление проекта](#11-обновление-проекта)
12. [Решение проблем](#12-решение-проблем)

---

## 1. Подготовка сервера

### Подключение к серверу
```bash
ssh root@ВАШ_IP_АДРЕС
```

### Обновление системы
```bash
apt update && apt upgrade -y
```

### Установка необходимых пакетов
```bash
apt install -y curl wget git nano ufw
```

### Настройка фаервола (рекомендуется)
```bash
ufw allow 22       # SSH
ufw allow 80       # HTTP
ufw allow 443      # HTTPS
ufw allow 3000     # Node.js (временно, для теста)
ufw enable
```

---

## 2. Установка Node.js

### Вариант 1: Через NodeSource (рекомендуется)
```bash
# Установка Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Проверка версии
node -v   # Должно показать v20.x.x
npm -v    # Должно показать 10.x.x
```

### Вариант 2: Через NVM
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

---

## 3. Загрузка проекта

### Вариант А: Через Git (если проект в репозитории)
```bash
cd /opt
git clone https://github.com/ваш-репозиторий/luminarix.git
cd luminarix
```

### Вариант Б: Загрузка файлов через SCP (с локального компьютера)
```bash
# На ВАШЕМ КОМПЬЮТЕРЕ выполните:
scp -r /путь/к/проекту root@ВАШ_IP:/opt/luminarix
```

### Вариант В: Загрузка через SFTP (FileZilla / WinSCP)
1. Подключитесь к серверу через SFTP (порт 22)
2. Загрузите всю папку проекта в `/opt/luminarix`

### Вариант Г: Создание проекта вручную на сервере
```bash
mkdir -p /opt/luminarix
cd /opt/luminarix

# Создайте все файлы проекта вручную через nano/vim
# или загрузите их любым удобным способом
```

---

## 4. Установка зависимостей и сборка

```bash
cd /opt/luminarix

# Установка зависимостей
npm install

# Сборка фронтенда (создаст папку dist/)
npm run build

# Проверка что dist/ создалась
ls -la dist/
# Должен быть файл index.html
```

### Возможные проблемы при сборке

**Ошибка "JavaScript heap out of memory":**
```bash
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build
```

**Ошибка зависимостей:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 5. Настройка Pterodactyl API

### Откройте файл server.js и проверьте настройки:
```bash
nano /opt/luminarix/server.js
```

### Найдите эти строки и измените при необходимости:
```javascript
const PTERO_URL = 'https://console.luminarix.fun';  // URL вашей Pterodactyl панели
const PTERO_ADMIN_KEY = 'ptla_ВАШ_КЛЮЧ';           // Application API Key
```

### Как получить API ключ Pterodactyl:
1. Войдите в **Pterodactyl Admin Panel**
2. Перейдите в **Application API** (в правом верхнем углу → Application API)
3. Нажмите **Create New** 
4. Описание: `Luminarix Billing`
5. Все права установите на **Read & Write**
6. Скопируйте сгенерированный ключ (начинается с `ptla_`)

### Важные требования к Pterodactyl:
- ✅ Панель должна быть доступна из интернета
- ✅ Должна быть хотя бы 1 нода (Node)
- ✅ На ноде должны быть свободные аллокации (IP:Port)
- ✅ Должен быть хотя бы 1 Nest с Egg'ами
- ✅ API ключ должен иметь все права (Read & Write)

### Проверка что Pterodactyl доступна:
```bash
# Тест подключения (замените URL и ключ на ваши)
curl -s -H "Authorization: Bearer ptla_ВАШ_КЛЮЧ" \
     -H "Accept: application/json" \
     https://console.luminarix.fun/api/application/servers | head -100
```

---

## 6. Запуск сервера

### Тестовый запуск (в терминале)
```bash
cd /opt/luminarix
node server.js
```

Вы должны увидеть:
```
═══════════════════════════════════════════
🚀 Luminarix Server запущен!
📍 http://localhost:3000
📡 Pterodactyl: https://console.luminarix.fun
🔑 API Key: ptla_NP8LbEO7...
═══════════════════════════════════════════
```

### Проверка:
```bash
# В другом терминале или через браузер:
curl http://localhost:3000

# Тест Pterodactyl подключения:
curl http://localhost:3000/api/ptero/test
```

### Остановка тестового запуска:
Нажмите `Ctrl + C`

---

## 7. Настройка автозапуска (systemd)

Чтобы сервер запускался автоматически при старте VDS:

### Создание systemd-сервиса:
```bash
nano /etc/systemd/system/luminarix.service
```

### Вставьте следующее:
```ini
[Unit]
Description=Luminarix Hosting Panel
Documentation=https://github.com/luminarix
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/luminarix
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

# Лимиты
LimitNOFILE=65536

# Логи
StandardOutput=journal
StandardError=journal
SyslogIdentifier=luminarix

[Install]
WantedBy=multi-user.target
```

### Активация и запуск:
```bash
# Перезагрузка systemd
systemctl daemon-reload

# Включение автозапуска
systemctl enable luminarix

# Запуск сервиса
systemctl start luminarix

# Проверка статуса
systemctl status luminarix
```

### Полезные команды:
```bash
# Посмотреть статус
systemctl status luminarix

# Перезапуск
systemctl restart luminarix

# Остановка
systemctl stop luminarix

# Просмотр логов (последние 100 строк)
journalctl -u luminarix -n 100

# Просмотр логов в реальном времени
journalctl -u luminarix -f

# Просмотр логов за сегодня
journalctl -u luminarix --since today
```

---

## 8. Настройка Nginx (домен + SSL)

### Установка Nginx:
```bash
apt install -y nginx
```

### Создание конфигурации:
```bash
nano /etc/nginx/sites-available/luminarix
```

### Вставьте (замените `my.luminarix.fun` на ваш домен):
```nginx
server {
    listen 80;
    server_name my.luminarix.fun;

    # Перенаправление на HTTPS (раскомментируйте после установки SSL)
    # return 301 https://$host$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

### Активация конфигурации:
```bash
# Создание символьной ссылки
ln -s /etc/nginx/sites-available/luminarix /etc/nginx/sites-enabled/

# Удаление дефолтного сайта (опционально)
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации
nginx -t

# Перезапуск Nginx
systemctl restart nginx
systemctl enable nginx
```

### Установка SSL-сертификата (Let's Encrypt):
```bash
# Установка Certbot
apt install -y certbot python3-certbot-nginx

# Получение сертификата (замените домен на ваш)
certbot --nginx -d my.luminarix.fun

# Или для нескольких доменов:
certbot --nginx -d my.luminarix.fun -d luminarix.fun

# Следуйте инструкциям:
# - Введите email
# - Согласитесь с условиями (Y)
# - Выберите автоматическое перенаправление на HTTPS (2)
```

### Автообновление сертификата:
```bash
# Тест автообновления
certbot renew --dry-run

# Certbot автоматически добавляет cron-задачу
```

### Итоговая конфигурация Nginx (после SSL):
```bash
nano /etc/nginx/sites-available/luminarix
```

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name my.luminarix.fun;
    return 301 https://$host$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name my.luminarix.fun;

    ssl_certificate /etc/letsencrypt/live/my.luminarix.fun/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/my.luminarix.fun/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

```bash
nginx -t && systemctl restart nginx
```

---

## 9. Настройка домена

### В DNS-панели вашего домена добавьте запись:

| Тип | Имя | Значение | TTL |
|-----|-----|----------|-----|
| A | my | IP_ВАШЕГО_VDS | 3600 |

Или если используете корневой домен:

| Тип | Имя | Значение | TTL |
|-----|-----|----------|-----|
| A | @ | IP_ВАШЕГО_VDS | 3600 |

### Проверка DNS:
```bash
# Подождите 5-15 минут после изменения DNS
dig my.luminarix.fun
# или
nslookup my.luminarix.fun
```

---

## 10. Проверка работы

### Чек-лист:
```bash
# 1. Проверка что Node.js сервер работает
systemctl status luminarix
# Должен показать: Active: active (running)

# 2. Проверка что порт 3000 слушается
ss -tlnp | grep 3000
# Должен показать: LISTEN ... :3000

# 3. Проверка Nginx
systemctl status nginx
# Должен показать: Active: active (running)

# 4. Тест локально
curl http://localhost:3000/api/ptero/test
# Должен вернуть JSON с success: true

# 5. Тест через домен (если настроен)
curl https://my.luminarix.fun/api/ptero/test
```

### Проверка в браузере:
1. Откройте `https://my.luminarix.fun` (или `http://ВАШ_IP:3000`)
2. Должна открыться главная страница Luminarix
3. Нажмите "Личный кабинет"
4. Войдите с админ-данными:
   - **Email:** `mishakakawka123@mail.ru`
   - **Пароль:** `KailyTeam2026ope`
5. Перейдите в "Админ панель" → "Pterodactyl"
6. Нажмите "Тестировать" — должно показать "Подключено"
7. Попробуйте создать сервер через "Купить сервер"

---

## 11. Обновление проекта

### Если используете Git:
```bash
cd /opt/luminarix
git pull

# Установка новых зависимостей (если есть)
npm install

# Пересборка фронтенда
npm run build

# Перезапуск сервера
systemctl restart luminarix
```

### Если загружаете файлы вручную:
```bash
# 1. Загрузите новые файлы в /opt/luminarix
# 2. Пересоберите фронтенд
cd /opt/luminarix
npm install
npm run build

# 3. Перезапустите сервер
systemctl restart luminarix
```

---

## 12. Решение проблем

### ❌ Сервер не запускается
```bash
# Проверка логов
journalctl -u luminarix -n 50

# Проверка прав
ls -la /opt/luminarix/
chown -R root:root /opt/luminarix/

# Ручной запуск для отладки
cd /opt/luminarix
node server.js
```

### ❌ Pterodactyl API не работает
```bash
# Проверка доступности панели
curl -s https://console.luminarix.fun/api/application/servers \
  -H "Authorization: Bearer ptla_ВАШ_КЛЮЧ" \
  -H "Accept: application/json"

# Если ошибка SSL:
curl -sk https://console.luminarix.fun/api/application/servers \
  -H "Authorization: Bearer ptla_ВАШ_КЛЮЧ" \
  -H "Accept: application/json"
```

### ❌ Ошибка "EADDRINUSE" (порт занят)
```bash
# Найти процесс на порту 3000
lsof -i :3000

# Убить процесс
kill -9 PID

# Или использовать другой порт
PORT=3001 node server.js
```

### ❌ Ошибка "Cannot find module"
```bash
cd /opt/luminarix
rm -rf node_modules
npm install
```

### ❌ Ошибка сборки (npm run build)
```bash
# Очистка кеша
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm run build
```

### ❌ 502 Bad Gateway (Nginx)
```bash
# Проверка что Node.js сервер работает
systemctl status luminarix

# Если не работает — запустите
systemctl start luminarix

# Проверка логов Nginx
cat /var/log/nginx/error.log | tail -20
```

### ❌ Сертификат SSL не обновляется
```bash
certbot renew --force-renewal
systemctl restart nginx
```

---

## 📁 Структура проекта

```
/opt/luminarix/
├── server.js           # ← Бэкенд-сервер (Express.js)
├── package.json        # ← Зависимости
├── vite.config.ts      # ← Конфигурация сборки
├── index.html          # ← HTML-шаблон
├── tsconfig.json       # ← Конфигурация TypeScript
├── src/                # ← Исходный код фронтенда
│   ├── App.tsx         #    Главный компонент
│   ├── main.tsx        #    Точка входа
│   ├── store.ts        #    Состояние, типы, API
│   ├── index.css       #    Стили
│   └── pages/          #    Страницы
│       ├── Landing.tsx
│       ├── Auth.tsx
│       ├── DashboardLayout.tsx
│       ├── MyServers.tsx
│       ├── ServerManage.tsx
│       ├── PurchaseFlow.tsx
│       ├── AccountSettings.tsx
│       ├── TopUp.tsx
│       └── AdminPanel.tsx
├── dist/               # ← Собранный фронтенд (после npm run build)
│   └── index.html
└── node_modules/       # ← Зависимости (после npm install)
```

---

## 🔑 Данные админ-аккаунта

| Поле | Значение |
|------|----------|
| **Username** | `kailyteam_mishakakawka` |
| **Email** | `mishakakawka123@mail.ru` |
| **Пароль** | `KailyTeam2026ope` |
| **Баланс** | 99,999₽ |

---

## 🔒 Безопасность

### Рекомендации:
1. **Измените пароль** админ-аккаунта после первого входа
2. **Не открывайте порт 3000** через firewall в production — используйте Nginx
3. **Регулярно обновляйте** Node.js и зависимости
4. **API ключ Pterodactyl** хранится только в `server.js` на сервере (не в браузере)
5. **Делайте бекапы** базы данных (localStorage хранится в браузере у каждого пользователя)

### Закрытие порта 3000 (после настройки Nginx):
```bash
ufw delete allow 3000
```

---

## 📞 Быстрый старт (TL;DR)

```bash
# 1. Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 2. Загрузка и сборка
cd /opt/luminarix
npm install
npm run build

# 3. Запуск
node server.js

# Готово! Откройте http://ВАШ_IP:3000
```

---

*Luminarix © 2025. Все права защищены.*
