# Как запустить сайт 24/7

Обычный "простой" хостинг (Vercel, Netlify и т.п.) сюда не подходит:
Telegram-бот работает через постоянный фоновый процесс, база данных —
это обычный файл на диске, а по 152-ФЗ персональные данные игроков должны
физически храниться на сервере в России. Поэтому нужен свой сервер (VPS).

Инструкция ниже — для Ubuntu 22.04/24.04, подходит для любого российского
провайдера (Timeweb Cloud, Selectel, Beget Cloud, Рег.ру и т.п.).

## 0. Что купить

- **VPS**: минимальная конфигурация — 2 ГБ ОЗУ, 1-2 vCPU, 20-30 ГБ диска,
  Ubuntu 22.04 или 24.04. Для этого сайта с запасом хватит самого дешёвого
  тарифа (обычно 300-600 ₽/мес).
- **Домен**: royal63.club (или тот, что вы выберете) — регистрируется у
  любого регистратора (Рег.ру, Timeweb и т.п.), обычно там же можно купить
  и VPS.

После покупки VPS провайдер даст вам **IP-адрес сервера** и **пароль root**
(или файл с SSH-ключом) — они понадобятся дальше.

## 1. Подключение к серверу

С Windows — через PowerShell или Windows Terminal:

```
ssh root@ВАШ_IP_АДРЕС
```

Введите пароль, который прислал провайдер (при вводе пароль не отображается
на экране — это нормально, просто наберите и нажмите Enter).

## 2. Первоначальная настройка сервера

Выполняйте команды по одной, копируя целиком:

```bash
apt update && apt upgrade -y
```

Установка Node.js 22 (нужна версия 22+, сайт использует experimental
`node:sqlite`):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git nginx
```

Проверка:

```bash
node -v   # должно быть v22.x
```

## 3. Клонирование сайта

```bash
cd /opt
git clone https://github.com/filippovden/Poker-Club.git royal63
cd royal63
git checkout claude/ui-ux-pro-max-skill-zsirsr
npm install
```

(если основная ветка на GitHub уже смержена — вместо `git checkout ...`
просто останьтесь на `main`)

## 4. Настройка секретов

Создайте файл `.env.local` (его нет в репозитории специально — там будут
реальные пароли):

```bash
nano .env.local
```

Вставьте и заполните реальными значениями (можно скопировать из вашего
рабочего `.env.local` на компьютере):

```
JWT_SECRET=длинная-случайная-строка
ADMIN_USERNAME=ваш-логин
ADMIN_PASSWORD=ваш-пароль

TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=...
TELEGRAM_ADMIN_CHAT_ID=...
```

Сохранить в nano: `Ctrl+O`, `Enter`, выйти — `Ctrl+X`.

## 5. Сборка сайта

```bash
npm run build
```

## 6. Запуск через PM2 (чтобы сайт работал 24/7 и сам перезапускался)

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Последняя команда выведет одну строку — скопируйте её и выполните отдельно
(она нужна, чтобы сайт сам поднимался после перезагрузки сервера).

Проверить, что сайт работает:

```bash
curl http://localhost:3000
```

Должен вернуться HTML-код главной страницы.

## 7. Настройка домена и Nginx

Сначала в панели вашего регистратора домена укажите **A-запись**,
указывающую на IP-адрес сервера (для `@` и для `www`).

На сервере:

```bash
cp deploy/nginx.conf.example /etc/nginx/sites-available/royal63
nano /etc/nginx/sites-available/royal63
```

Замените `royal63.club` на ваш реальный домен (если отличается), сохраните.

```bash
ln -s /etc/nginx/sites-available/royal63 /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

Проверьте в браузере `http://ваш-домен` — должен открыться сайт (пока без
замка HTTPS).

## 8. HTTPS (бесплатный сертификат)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d royal63.club -d www.royal63.club
```

Certbot сам допишет конфиг Nginx и настроит редирект на HTTPS. Отвечайте
на вопросы (email для уведомлений об истечении сертификата, согласие с
условиями). Сертификат продлевается автоматически.

## 9. Фаервол

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## 10. Как обновлять сайт в будущем

Когда я пришлю новые изменения (после `git push` в ветку):

```bash
cd /opt/royal63
git pull
npm install
npm run build
pm2 restart royal63
```

## 11. Резервное копирование базы данных

База — это один файл `data.sqlite`. Простой ежедневный бэкап через cron:

```bash
mkdir -p /opt/backups
(crontab -l 2>/dev/null; echo "0 3 * * * cp /opt/royal63/data.sqlite /opt/backups/data-\$(date +\%F).sqlite") | crontab -
```

Это будет сохранять копию каждую ночь в 3:00. Изредка стоит скачивать эти
файлы к себе на компьютер (например через `scp`) — на случай, если сам
сервер выйдет из строя.

## Полезные команды PM2

```bash
pm2 status          # статус процесса
pm2 logs royal63     # логи сайта и бота в реальном времени
pm2 restart royal63  # перезапустить после обновления
```
