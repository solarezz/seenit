# Деплой Seenit на seenit.solarezz.dev (Docker + системный nginx)

Контейнеры: **Postgres** + **web** (Next.js, слушает `127.0.0.1:3100`) + **bot** (grammY, long-polling).
HTTPS и домен держит **системный nginx** на сервере `77.91.79.169`, проксируя на контейнер.

```
Интернет → nginx (:443, TLS) → 127.0.0.1:3100 (docker: web) → db (docker)
                                                   bot (docker) ─┘  (без внешних портов)
```

## 0. Предпосылки
- Docker + Docker Compose на сервере (`docker compose version`).
- **DNS**: A-запись `seenit.solarezz.dev` → `77.91.79.169` (проверь: `dig +short seenit.solarezz.dev`).
- nginx и certbot установлены (`nginx -v`, `certbot --version`). Если certbot нет: `sudo apt install certbot python3-certbot-nginx`.

## 1. Перенести проект на сервер
```bash
git clone <repo> seenit && cd seenit
# .env в git не входит — перенеси его отдельно (scp) или создай на сервере.
```
Проверь, что в `.env` заданы: `POSTGRES_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TMDB_API_KEY`,
`NEXT_PUBLIC_APP_URL=https://seenit.solarezz.dev`.

## 2. Поднять контейнеры
```bash
docker compose up -d --build
docker compose logs -f web bot   # дождись "Ready" у web и "Бот @... запущен"
```
Проверка, что web отвечает локально:
```bash
curl -I http://127.0.0.1:3100    # ожидаем HTTP 200
```

## 3. Настроить nginx
```bash
sudo cp nginx/seenit.solarezz.dev.conf /etc/nginx/sites-available/seenit.solarezz.dev
sudo ln -s /etc/nginx/sites-available/seenit.solarezz.dev /etc/nginx/sites-enabled/
sudo mkdir -p /var/www/certbot
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Выпустить TLS-сертификат (webroot-метод)
`--nginx`-метод спотыкается, если `location /` проксирует всё в приложение (ACME-путь
отдаёт 404). Поэтому выпускаем через webroot, а затем ставим сертификат в nginx:
```bash
sudo certbot certonly --webroot -w /var/www/certbot -d seenit.solarezz.dev
sudo certbot install --nginx --cert-name seenit.solarezz.dev
sudo nginx -t && sudo systemctl reload nginx
```
Открой `https://seenit.solarezz.dev` — должна отдаться страница «Открой через Telegram»
(вне Telegram нет подписи — это норма).

## 5. Подключить Mini App к боту (@BotFather)
1. [@BotFather](https://t.me/BotFather) → `/myapps` → выбрать бота → **Web App URL** = `https://seenit.solarezz.dev`.
2. `/setmenubutton` → бот → тот же URL → текст кнопки «🎬 Seenit».
3. **Для инвайт-ссылок друзей** (`?startapp=...`) настрой Main Mini App: BotFather → бот → **Configure Mini App** → Enable → тот же URL. Без этого кнопка «Пригласить друга» не откроет приложение у друга.
4. Открой бота → кнопка меню запустит мини-апп. Либо напиши боту «Дюна» — проверка топ-3.

> ⏰ Плановые уведомления (новинки по вкусу — пн 09:00, напоминание — пт 19:00) работают по времени контейнера (по умолчанию **UTC**). Хочешь МСК — добавь `TZ=Europe/Moscow` в окружение сервиса `bot` в `docker-compose.yml`.

## Обновление после правок кода
```bash
git pull && docker compose up -d --build
```
Схема БД мигрируется автоматически при старте web (`prisma db push`).

## Шпаргалка
| Действие | Команда |
|----------|---------|
| Логи | `docker compose logs -f` |
| Рестарт бота | `docker compose restart bot` |
| Стоп | `docker compose down` (данные БД сохранятся в volume `pgdata`) |
| Бэкап БД | `docker compose exec db pg_dump -U seenit seenit > backup.sql` |
| Обновить сертификат | автопродление certbot; проверка: `sudo certbot renew --dry-run` |

## Если что-то не так
- **502 Bad Gateway** — контейнер web не поднялся: `docker compose logs web`.
- **Telegram не открывает мини-апп** — URL должен быть `https://` с валидным сертификатом (Let's Encrypt ок), проверь `curl -I https://seenit.solarezz.dev`.
- **Бот молчит** — проверь `TELEGRAM_BOT_TOKEN` и `docker compose logs bot`.
