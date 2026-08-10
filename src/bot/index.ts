import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";
import { searchTitles, getTitle, posterUrl, type TmdbType } from "../lib/tmdb";
import { upsertTitle } from "../lib/titles";
import { upsertUser } from "../lib/auth";
import { prisma } from "../lib/db";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан в .env");

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
const bot = new Bot(token);

// /start — приветствие + кнопка открыть мини-апп
bot.command("start", async (ctx) => {
  const kb = appUrl.startsWith("https")
    ? new InlineKeyboard().webApp("🎬 Открыть вишлист", appUrl)
    : undefined;
  await ctx.reply(
    "Привет! Это <b>Seenit</b> 🎬\n" +
      "Пришли название фильма или сериала — добавлю в твой вишлист.\n" +
      "Например: <i>Дюна</i> или <i>Во все тяжкие</i>.",
    { parse_mode: "HTML", reply_markup: kb },
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply("Просто напиши название фильма/сериала. Я покажу до 3 вариантов — выбери нужный.");
});

// Любой текст (не команда) → поиск топ-3
bot.on("message:text", async (ctx) => {
  const q = ctx.message.text.trim();
  if (!q || q.startsWith("/")) return;

  await ctx.replyWithChatAction("typing");
  let results;
  try {
    results = await searchTitles(q, 3);
  } catch (e) {
    console.error(e);
    return ctx.reply("Не получилось найти сейчас, попробуй ещё раз чуть позже.");
  }

  if (results.length === 0) {
    return ctx.reply(`По запросу «${q}» ничего не нашёл. Проверь название?`);
  }

  await ctx.reply("Нашёл — какой добавить в вишлист?");
  for (const r of results) {
    const label = `${r.title}${r.year ? ` (${r.year})` : ""}`;
    const kind = r.type === "tv" ? "Сериал" : "Фильм";
    const kb = new InlineKeyboard().text("✅ Этот", `add:${r.type}:${r.tmdbId}`);
    const poster = posterUrl(r.poster, "w342");
    const caption = `<b>${label}</b>\n${kind}`;
    try {
      if (poster) {
        await ctx.replyWithPhoto(poster, { caption, parse_mode: "HTML", reply_markup: kb });
      } else {
        await ctx.reply(caption, { parse_mode: "HTML", reply_markup: kb });
      }
    } catch {
      await ctx.reply(caption, { parse_mode: "HTML", reply_markup: kb });
    }
  }
});

// Нажатие «✅ Этот» → добавить в вишлист
bot.callbackQuery(/^add:(movie|tv):(\d+)$/, async (ctx) => {
  const type = ctx.match![1] as TmdbType;
  const tmdbId = Number(ctx.match![2]);

  try {
    const user = await upsertUser({
      id: ctx.from.id,
      username: ctx.from.username,
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name,
    });

    const meta = await getTitle(tmdbId, type);
    const title = await upsertTitle(meta);

    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_titleId: { userId: user.id, titleId: title.id } },
    });

    if (existing) {
      await ctx.answerCallbackQuery({ text: "Уже в вишлисте 👍" });
    } else {
      await prisma.wishlistItem.create({ data: { userId: user.id, titleId: title.id } });
      await prisma.activity.create({ data: { userId: user.id, type: "added", titleId: title.id } });
      await ctx.answerCallbackQuery({ text: "Добавил ✅" });
    }

    const label = `${meta.title}${meta.year ? ` (${meta.year})` : ""}`;
    const done = `✅ <b>${label}</b> — в твоём вишлисте`;
    // Обновляем сообщение: убираем кнопку
    try {
      if (ctx.callbackQuery.message?.photo) {
        await ctx.editMessageCaption({ caption: done, parse_mode: "HTML" });
      } else {
        await ctx.editMessageText(done, { parse_mode: "HTML" });
      }
    } catch {
      /* сообщение могло устареть — не критично */
    }
  } catch (e) {
    console.error(e);
    await ctx.answerCallbackQuery({ text: "Ошибка, попробуй ещё раз" });
  }
});

bot.catch((err) => console.error("Bot error:", err.error));

bot.start({
  onStart: (info) => console.log(`🤖 Бот @${info.username} запущен`),
});
