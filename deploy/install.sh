#!/bin/bash
# ═══════════════════════════════════════════
# Luminarix — Автоматический установщик
# ═══════════════════════════════════════════
# Использование: bash install.sh
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}  🚀 Luminarix — Установка${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

# Проверка root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Запустите скрипт от root: sudo bash install.sh${NC}"
    exit 1
fi

# ── Шаг 1: Обновление системы ──
echo -e "${BLUE}[1/7]${NC} Обновление системы..."
apt update -qq && apt upgrade -y -qq > /dev/null 2>&1
echo -e "${GREEN}  ✓ Система обновлена${NC}"

# ── Шаг 2: Установка зависимостей ──
echo -e "${BLUE}[2/7]${NC} Установка зависимостей..."
apt install -y -qq curl wget git nano ufw nginx > /dev/null 2>&1
echo -e "${GREEN}  ✓ Зависимости установлены${NC}"

# ── Шаг 3: Установка Node.js ──
echo -e "${BLUE}[3/7]${NC} Установка Node.js 20.x..."
if command -v node &> /dev/null; then
    NODE_VER=$(node -v)
    echo -e "${YELLOW}  ⚠ Node.js уже установлен: ${NODE_VER}${NC}"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt install -y -qq nodejs > /dev/null 2>&1
    echo -e "${GREEN}  ✓ Node.js $(node -v) установлен${NC}"
fi

# ── Шаг 4: Установка npm зависимостей ──
echo -e "${BLUE}[4/7]${NC} Установка npm зависимостей..."
cd /opt/luminarix
npm install --silent > /dev/null 2>&1
echo -e "${GREEN}  ✓ Зависимости установлены${NC}"

# ── Шаг 5: Сборка фронтенда ──
echo -e "${BLUE}[5/7]${NC} Сборка фронтенда..."
npm run build > /dev/null 2>&1
echo -e "${GREEN}  ✓ Фронтенд собран${NC}"

# ── Шаг 6: Настройка systemd ──
echo -e "${BLUE}[6/7]${NC} Настройка автозапуска..."
cp /opt/luminarix/deploy/luminarix.service /etc/systemd/system/luminarix.service
systemctl daemon-reload
systemctl enable luminarix > /dev/null 2>&1
systemctl start luminarix
echo -e "${GREEN}  ✓ Сервис luminarix создан и запущен${NC}"

# ── Шаг 7: Настройка Nginx ──
echo -e "${BLUE}[7/7]${NC} Настройка Nginx..."
cp /opt/luminarix/deploy/nginx.conf /etc/nginx/sites-available/luminarix
ln -sf /etc/nginx/sites-available/luminarix /etc/nginx/sites-enabled/luminarix
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1
systemctl restart nginx
systemctl enable nginx > /dev/null 2>&1
echo -e "${GREEN}  ✓ Nginx настроен${NC}"

# ── Настройка фаервола ──
echo -e "${BLUE}[*]${NC} Настройка фаервола..."
ufw allow 22 > /dev/null 2>&1
ufw allow 80 > /dev/null 2>&1
ufw allow 443 > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1
echo -e "${GREEN}  ✓ Фаервол настроен${NC}"

# ── Готово ──
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "ВАШ_IP")

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Установка завершена!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}📍 Сайт:${NC}      http://${SERVER_IP}"
echo -e "  ${BLUE}📡 API:${NC}       http://${SERVER_IP}/api/ptero/test"
echo ""
echo -e "  ${YELLOW}👤 Админ:${NC}"
echo -e "     Email:    mishakakawka123@mail.ru"
echo -e "     Пароль:   KailyTeam2026ope"
echo ""
echo -e "  ${YELLOW}📝 Следующие шаги:${NC}"
echo -e "     1. Настройте домен (A-запись → ${SERVER_IP})"
echo -e "     2. Измените домен в /etc/nginx/sites-available/luminarix"
echo -e "     3. Установите SSL: certbot --nginx -d ваш.домен"
echo -e "     4. Проверьте настройки Pterodactyl в /opt/luminarix/server.js"
echo ""
echo -e "  ${BLUE}📋 Управление:${NC}"
echo -e "     systemctl status luminarix    — статус"
echo -e "     systemctl restart luminarix   — перезапуск"
echo -e "     journalctl -u luminarix -f    — логи"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""
