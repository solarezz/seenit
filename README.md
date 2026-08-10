# FilmWishlist 🎬

Telegram Mini App: вишлист фильмов/сериалов, рекомендации и социалка. Полное ТЗ — в [SPEC.md](./SPEC.md).

**Статус:** Фаза 1 (ядро) готова — авторизация через Telegram, поиск TMDB, вишлист (статусы + ⭐-оценки), бот-добавление по названию с подтверждением топ-3.

## Стек
Next.js 15 (App Router, TS) · Prisma + Postgres · grammY (бот) · TMDB API.

## Что нужно получить (один раз)

1. **Bot token** — напиши [@BotFather](https://t.me/BotFather) → `/newbot` → скопируй токен.
2. **TMDB токен** — [themoviedb.org](https://www.themoviedb.org) → Settings → API → создать → скопировать **API Read Access Token** (v4, длинный, начинается с `eyJ…`).
3. **База Postgres** — бесплатно на [Neon](https://neon.tech) или [Supabase](https://supabase.com): создай проект → скопируй connection string.

Впиши всё в файл `.env` (шаблон — `.env.example`):

```
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=123456:ABC...
TMDB_API_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://<твой-публичный-url>
```

## Запуск локально

```bash
npm install
npm run db:push      # создать таблицы в БД
npm run dev          # мини-апп на http://localhost:3000
npm run bot          # бот (в отдельном терминале)
```

Мини-апп открывается **только внутри Telegram** (там приходит подпись `initData`). Чтобы протестировать локально:

1. Прокинь localhost наружу: `npx ngrok http 3000` → получишь `https://xxx.ngrok-free.app`.
2. Впиши этот URL в `NEXT_PUBLIC_APP_URL` в `.env`.
3. В @BotFather: `/newapp` (или `/setmenubutton`) → укажи этот https-URL как адрес Mini App.
4. Открой бота в Telegram → кнопка меню запустит мини-апп.

## Проверить бота
Напиши боту в личку любое название, например `Дюна` — он покажет до 3 карточек с постером и кнопкой «✅ Этот». Нажатие добавит фильм в твой вишлист.

## Полезные команды

| Команда | Что делает |
|---------|-----------|
| `npm run dev` | Мини-апп (Next.js) |
| `npm run bot` | Бот (grammY, hot-reload) |
| `npm run db:push` | Применить схему к БД |
| `npm run db:studio` | Визуальный редактор БД (Prisma Studio) |
| `npm run build` | Прод-сборка |

## Деплой
Прод крутится в Docker на своём сервере за системным nginx (домен `seenit.solarezz.dev`).
Полная инструкция — в [DEPLOY.md](./DEPLOY.md). Кратко:
```bash
docker compose up -d --build      # db + web (127.0.0.1:3000) + bot
```
nginx проксирует домен на `127.0.0.1:3000`, TLS — через certbot.

## Дальше (Фазы 2–3)
Рекомендации (2 вкладки), профиль + любимые, друзья (инвайт + поиск), реки-инбокс, лента активности, уведомления. Скелет вкладок уже в UI (`src/app/page.tsx`).
