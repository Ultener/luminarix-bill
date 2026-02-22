#!/bin/bash
# ═══════════════════════════════════════════
# Luminarix Bill — Менеджер установки
# ═══════════════════════════════════════════
# Использование: sudo bash install.sh
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Функция для отображения заголовка
show_header() {
    clear
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  📦 Luminarix Bill — Управление панелью${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Функция для проверки root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}❌ Запустите скрипт от root: sudo bash install.sh${NC}"
        exit 1
    fi
}

# Функция установки панели
install_panel() {
    show_header
    echo -e "${BLUE}▶ НАЧАЛО УСТАНОВКИ ПАНЕЛИ${NC}"
    echo -e "${CYAN}───────────────────────────────────────────────────────${NC}"
    echo ""

    # ── Шаг 1: Обновление системы ──
    echo -e "${BLUE}[1/9]${NC} Обновление системы..."
    apt update -qq && apt upgrade -y -qq > /dev/null 2>&1
    echo -e "${GREEN}  ✓ Система обновлена${NC}"

    # ── Шаг 2: Установка зависимостей ──
    echo -e "${BLUE}[2/9]${NC} Установка зависимостей..."
    apt install -y -qq curl wget git nano ufw nginx > /dev/null 2>&1
    echo -e "${GREEN}  ✓ Зависимости установлены${NC}"

    # ── Шаг 3: Подготовка директории ──
    echo -e "${BLUE}[3/9]${NC} Подготовка директории /opt/luminarix..."

    # Создаем бэкап если папка уже существует
    if [ -d "/opt/luminarix" ]; then
        BACKUP_NAME="/opt/luminarix_backup_$(date +%Y%m%d_%H%M%S)"
        mv /opt/luminarix "$BACKUP_NAME"
        echo -e "${YELLOW}  ⚠ Существующая папка перемещена в ${BACKUP_NAME}${NC}"
    fi

    mkdir -p /opt/luminarix
    echo -e "${GREEN}  ✓ Директория создана${NC}"

    # ── Шаг 4: Скачивание репозитория ──
    echo -e "${BLUE}[4/9]${NC} Скачивание репозитория..."
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"

    git clone https://github.com/Ultener/luminarix-bill.git . > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ Репозиторий успешно скачан${NC}"
    else
        echo -e "${RED}  ❌ Ошибка при скачивании репозитория${NC}"
        exit 1
    fi

    # ── Шаг 5: Копирование файлов ──
    echo -e "${BLUE}[5/9]${NC} Копирование файлов..."
    cp -r ./* /opt/luminarix/ 2>/dev/null || cp -r . /opt/luminarix/
    rm -rf "$TEMP_DIR"
    echo -e "${GREEN}  ✓ Файлы скопированы в /opt/luminarix${NC}"

    # ── Шаг 6: Установка Node.js ──
    echo -e "${BLUE}[6/9]${NC} Установка Node.js 20.x..."
    if command -v node &> /dev/null; then
        NODE_VER=$(node -v)
        echo -e "${YELLOW}  ⚠ Node.js уже установлен: ${NODE_VER}${NC}"
    else
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
        apt install -y -qq nodejs > /dev/null 2>&1
        echo -e "${GREEN}  ✓ Node.js $(node -v) установлен${NC}"
    fi

    # ── Шаг 7: Проверка и запуск install.sh ──
    echo -e "${BLUE}[7/9]${NC} Запуск скрипта установки..."
    cd /opt/luminarix

    if [ -f "deploy/install.sh" ]; then
        chmod +x deploy/install.sh
        ./deploy/install.sh
        echo -e "${GREEN}  ✓ Скрипт установки выполнен${NC}"
    else
        echo -e "${YELLOW}  ⚠ Файл deploy/install.sh не найден, продолжаем...${NC}"
        
        if [ -f "package.json" ]; then
            echo -e "${BLUE}  └─ Установка npm зависимостей...${NC}"
            npm install --silent > /dev/null 2>&1
            echo -e "${GREEN}     ✓ Зависимости установлены${NC}"
            
            if grep -q '"build"' package.json; then
                echo -e "${BLUE}  └─ Сборка проекта...${NC}"
                npm run build > /dev/null 2>&1
                echo -e "${GREEN}     ✓ Сборка выполнена${NC}"
            fi
        fi
    fi

    # ── Шаг 8: Настройка systemd сервиса ──
    echo -e "${BLUE}[8/9]${NC} Настройка автозапуска..."

    if [ ! -f "/etc/systemd/system/luminarix.service" ]; then
        if [ -f "/opt/luminarix/deploy/luminarix.service" ]; then
            cp /opt/luminarix/deploy/luminarix.service /etc/systemd/system/
        else
            cat > /etc/systemd/system/luminarix.service << 'EOF'
[Unit]
Description=Luminarix Bill Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/luminarix
ExecStart=/usr/bin/node /opt/luminarix/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
            echo -e "${YELLOW}  ⚠ Создан базовый systemd сервис${NC}"
        fi
    fi

    systemctl daemon-reload
    systemctl enable luminarix > /dev/null 2>&1
    systemctl start luminarix
    echo -e "${GREEN}  ✓ Сервис luminarix создан и запущен${NC}"

    # ── Шаг 9: Настройка Nginx ──
    echo -e "${BLUE}[9/9]${NC} Настройка Nginx..."

    if [ -f "/opt/luminarix/deploy/nginx.conf" ]; then
        cp /opt/luminarix/deploy/nginx.conf /etc/nginx/sites-available/luminarix
    else
        cat > /etc/nginx/sites-available/luminarix << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
        echo -e "${YELLOW}  ⚠ Создан базовый nginx конфиг${NC}"
    fi

    ln -sf /etc/nginx/sites-available/luminarix /etc/nginx/sites-enabled/
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

    # ── Проверка статуса ──
    echo -e "${BLUE}[*]${NC} Проверка сервисов..."
    sleep 3
    if systemctl is-active --quiet luminarix; then
        echo -e "${GREEN}  ✓ Сервис luminarix работает${NC}"
    else
        echo -e "${RED}  ❌ Сервис luminarix не работает${NC}"
    fi

    # ── Получение IP ──
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "ВАШ_IP")

    # ── Готово ──
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ Установка Luminarix Bill завершена!${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${BLUE}📍 Сайт:${NC}      http://${SERVER_IP}"
    echo -e "  ${BLUE}📁 Директория:${NC} /opt/luminarix"
    echo ""
    echo -e "  ${YELLOW}📝 Следующие шаги:${NC}"
    echo -e "     1. Настройте домен (A-запись → ${SERVER_IP})"
    echo -e "     2. Измените домен в /etc/nginx/sites-available/luminarix"
    echo -e "     3. Установите SSL: certbot --nginx -d ваш.домен"
    echo ""
}

# Функция удаления панели
uninstall_panel() {
    show_header
    echo -e "${RED}▶ УДАЛЕНИЕ ПАНЕЛИ${NC}"
    echo -e "${CYAN}───────────────────────────────────────────────────────${NC}"
    echo ""
    
    # Проверяем существует ли панель
    if [ ! -d "/opt/luminarix" ]; then
        echo -e "${YELLOW}⚠ Панель не установлена (директория /opt/luminarix не найдена)${NC}"
        echo ""
        read -p "Нажмите Enter для возврата в меню..."
        return
    fi
    
    echo -e "${YELLOW}⚠ ВНИМАНИЕ: Это действие удалит панель и все её данные!${NC}"
    echo -e "${YELLOW}⚠ Будут удалены:${NC}"
    echo -e "   - Директория /opt/luminarix"
    echo -e "   - Systemd сервис luminarix"
    echo -e "   - Nginx конфигурация"
    echo ""
    
    read -p "Вы уверены, что хотите продолжить? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}❌ Удаление отменено${NC}"
        read -p "Нажмите Enter для возврата в меню..."
        return
    fi
    
    echo ""
    echo -e "${BLUE}[1/4]${NC} Остановка сервисов..."
    systemctl stop luminarix 2>/dev/null || true
    systemctl disable luminarix 2>/dev/null || true
    echo -e "${GREEN}  ✓ Сервисы остановлены${NC}"
    
    echo -e "${BLUE}[2/4]${NC} Удаление systemd сервиса..."
    rm -f /etc/systemd/system/luminarix.service
    systemctl daemon-reload
    echo -e "${GREEN}  ✓ Сервис удален${NC}"
    
    echo -e "${BLUE}[3/4]${NC} Удаление Nginx конфигурации..."
    rm -f /etc/nginx/sites-available/luminarix
    rm -f /etc/nginx/sites-enabled/luminarix
    systemctl restart nginx
    echo -e "${GREEN}  ✓ Nginx конфигурация удалена${NC}"
    
    echo -e "${BLUE}[4/4]${NC} Удаление файлов панели..."
    rm -rf /opt/luminarix
    echo -e "${GREEN}  ✓ Файлы удалены${NC}"
    
    echo ""
    echo -e "${GREEN}✅ Панель Luminarix Bill успешно удалена!${NC}"
    echo ""
    read -p "Нажмите Enter для возврата в меню..."
}

# Функция обновления панели
update_panel() {
    show_header
    echo -e "${PURPLE}▶ ОБНОВЛЕНИЕ ПАНЕЛИ${NC}"
    echo -e "${CYAN}───────────────────────────────────────────────────────${NC}"
    echo ""
    
    # Проверяем существует ли панель
    if [ ! -d "/opt/luminarix" ]; then
        echo -e "${YELLOW}⚠ Панель не установлена. Сначала выполните установку.${NC}"
        echo ""
        read -p "Нажмите Enter для возврата в меню..."
        return
    fi
    
    echo -e "${BLUE}[1/5]${NC} Создание резервной копии..."
    BACKUP_NAME="/opt/luminarix_backup_$(date +%Y%m%d_%H%M%S)"
    cp -r /opt/luminarix "$BACKUP_NAME"
    echo -e "${GREEN}  ✓ Резервная копия создана: ${BACKUP_NAME}${NC}"
    
    echo -e "${BLUE}[2/5]${NC} Остановка сервиса..."
    systemctl stop luminarix
    echo -e "${GREEN}  ✓ Сервис остановлен${NC}"
    
    echo -e "${BLUE}[3/5]${NC} Скачивание обновлений..."
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    git clone https://github.com/Ultener/luminarix-bill.git . > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ Обновления скачаны${NC}"
    else
        echo -e "${RED}  ❌ Ошибка при скачивании обновлений${NC}"
        rm -rf "$TEMP_DIR"
        systemctl start luminarix
        read -p "Нажмите Enter для возврата в меню..."
        return
    fi
    
    echo -e "${BLUE}[4/5]${NC} Обновление файлов..."
    cp -r ./* /opt/luminarix/ 2>/dev/null || cp -r . /opt/luminarix/
    rm -rf "$TEMP_DIR"
    echo -e "${GREEN}  ✓ Файлы обновлены${NC}"
    
    echo -e "${BLUE}[5/5]${NC} Установка зависимостей и сборка..."
    cd /opt/luminarix
    
    if [ -f "package.json" ]; then
        npm install --silent > /dev/null 2>&1
        echo -e "${GREEN}  ✓ Зависимости обновлены${NC}"
        
        if grep -q '"build"' package.json; then
            npm run build > /dev/null 2>&1
            echo -e "${GREEN}  ✓ Сборка выполнена${NC}"
        fi
    fi
    
    echo -e "${BLUE}[*]${NC} Запуск сервиса..."
    systemctl start luminarix
    sleep 2
    
    if systemctl is-active --quiet luminarix; then
        echo -e "${GREEN}  ✓ Сервис успешно запущен${NC}"
    else
        echo -e "${RED}  ❌ Ошибка при запуске сервиса${NC}"
        echo -e "${YELLOW}     Проверьте логи: journalctl -u luminarix -f${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Панель Luminarix Bill успешно обновлена!${NC}"
    echo -e "${YELLOW}📌 Резервная копия сохранена в: ${BACKUP_NAME}${NC}"
    echo ""
    read -p "Нажмите Enter для возврата в меню..."
}

# Функция отображения меню
show_menu() {
    show_header
    
    # Проверяем статус установки
    if [ -d "/opt/luminarix" ]; then
        PANEL_STATUS="${GREEN}✅ УСТАНОВЛЕНА${NC}"
        if systemctl is-active --quiet luminarix; then
            PANEL_STATUS="${GREEN}✅ РАБОТАЕТ${NC}"
        else
            PANEL_STATUS="${RED}❌ НЕ РАБОТАЕТ${NC}"
        fi
    else
        PANEL_STATUS="${YELLOW}⚠ НЕ УСТАНОВЛЕНА${NC}"
    fi
    
    echo -e "  ${WHITE}Статус панели:${NC} $PANEL_STATUS"
    echo ""
    echo -e "${CYAN}  ╔════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}  ║           ВЫБЕРИТЕ ДЕЙСТВИЕ            ║${NC}"
    echo -e "${CYAN}  ╠════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}  ║${NC}  ${GREEN}0.${NC} Установка панели                   ${CYAN}║${NC}"
    echo -e "${CYAN}  ║${NC}  ${RED}1.${NC} Удаление панели                    ${CYAN}║${NC}"
    echo -e "${CYAN}  ║${NC}  ${YELLOW}2.${NC} Обновление панели                  ${CYAN}║${NC}"
    echo -e "${CYAN}  ║${NC}  ${BLUE}3.${NC} Выход                              ${CYAN}║${NC}"
    echo -e "${CYAN}  ╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -n -e "${WHITE}┌─[${NC}${CYAN}ВВЕДИТЕ НОМЕР${NC}${WHITE}]${NC}\n"
    echo -n -e "${WHITE}└──╼ ${NC}"
    read choice
}

# Основной цикл программы
main() {
    check_root
    
    while true; do
        show_menu
        
        case $choice in
            0)
                install_panel
                ;;
            1)
                uninstall_panel
                ;;
            2)
                update_panel
                ;;
            3)
                echo ""
                echo -e "${GREEN}👋 До свидания!${NC}"
                echo ""
                exit 0
                ;;
            *)
                echo ""
                echo -e "${RED}❌ Неверный выбор. Пожалуйста, введите 0, 1, 2 или 3${NC}"
                sleep 2
                ;;
        esac
    done
}

# Запуск программы
main "$@"
