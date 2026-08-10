import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";
import cron from "node-cron";
import { searchTitles, posterUrl, type TmdbTitle } from "../lib/tmdb";
import { upsertTitle } from "../lib/titles";
import { upsertUser } from "../lib/auth";
import { prisma } from "../lib/db";
import { sendWeeklyReleases, sendWatchReminders } from "../lib/reminders";

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

// Реестр групп поиска в памяти: по groupId храним id сообщений-вариантов и кандидатов,
// чтобы при выборе удалить остальные сообщения (в callback_data все id не влезают).
interface SearchGroup {
  chatId: number;
  headerId: number;
  optionIds: number[];
  candidates: TmdbTitle[];
  createdAt: number;
}
const groups = new Map<string, SearchGroup>();

function pruneGroups() {
  const now = Date.now();
  for (const [id, g] of groups) {
    if (now - g.createdAt > 60 * 60 * 1000) groups.delete(id);
  }
}

async function deleteMessages(chatId: number, ids: number[]) {
  await Promise.all(ids.map((id) => bot.api.deleteMessage(chatId, id).catch(() => {})));
}

// Любой текст (не команда) → поиск топ-3
bot.on("message:text", async (ctx) => {
  const q = ctx.message.text.trim();
  if (!q || q.startsWith("/")) return;

  await ctx.replyWithChatAction("typing");
  let results: TmdbTitle[];
  try {
    results = await searchTitles(q, 3);
  } catch (e) {
    console.error(e);
    return ctx.reply("Не получилось найти сейчас, попробуй ещё раз чуть позже.");
  }

  if (results.length === 0) {
    return ctx.reply(`По запросу «${q}» ничего не нашёл. Проверь название?`);
  }

  pruneGroups();
  const groupId = Math.random().toString(36).slice(2, 8);

  const header = await ctx.reply("Нашёл — какой добавить в вишлист?", {
    reply_markup: new InlineKeyboard().text("❌ Ничего из этого", `nope:${groupId}`),
  });

  const optionIds: number[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const label = `${r.title}${r.year ? ` (${r.year})` : ""}`;
    const kind = r.type === "tv" ? "Сериал" : "Фильм";
    const kb = new InlineKeyboard().text("✅ Этот", `pick:${groupId}:${i}`);
    const poster = posterUrl(r.poster, "w342");
    const caption = `<b>${label}</b>\n${kind}`;
    let msg;
    try {
      msg = poster
        ? await ctx.replyWithPhoto(poster, { caption, parse_mode: "HTML", reply_markup: kb })
        : await ctx.reply(caption, { parse_mode: "HTML", reply_markup: kb });
    } catch {
      msg = await ctx.reply(caption, { parse_mode: "HTML", reply_markup: kb });
    }
    optionIds.push(msg.message_id);
  }

  groups.set(groupId, {
    chatId: ctx.chat.id,
    headerId: header.message_id,
    optionIds,
    candidates: results,
    createdAt: Date.now(),
  });
});

// «✅ Этот» → добавить выбранный, удалить остальные варианты и заголовок
bot.callbackQuery(/^pick:([a-z0-9]+):(\d+)$/, async (ctx) => {
  const groupId = ctx.match![1];
  const index = Number(ctx.match![2]);
  const group = groups.get(groupId);
  const chosen = group?.candidates[index];

  if (!group || !chosen) {
    await ctx.answerCallbackQuery({ text: "Список устарел — отправь название заново" });
    return;
  }

  try {
    const user = await upsertUser({
      id: ctx.from.id,
      username: ctx.from.username,
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name,
    });

    const title = await upsertTitle(chosen);
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

    // Удаляем заголовок и все варианты, кроме выбранного
    const chosenMsgId = ctx.callbackQuery.message?.message_id;
    await deleteMessages(
      group.chatId,
      [group.headerId, ...group.optionIds].filter((id) => id !== chosenMsgId),
    );

    // Выбранное превращаем в подтверждение (постер остаётся, кнопку убираем)
    const label = `${chosen.title}${chosen.year ? ` (${chosen.year})` : ""}`;
    const done = `✅ <b>${label}</b> — в твоём вишлисте`;
    try {
      if (ctx.callbackQuery.message?.photo) {
        await ctx.editMessageCaption({
          caption: done,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [] },
        });
      } else {
        await ctx.editMessageText(done, { parse_mode: "HTML", reply_markup: { inline_keyboard: [] } });
      }
    } catch {
      /* сообщение могло устареть — не критично */
    }

    groups.delete(groupId);
  } catch (e) {
    console.error(e);
    await ctx.answerCallbackQuery({ text: "Ошибка, попробуй ещё раз" });
  }
});

// «❌ Ничего из этого» → удалить все сообщения группы
bot.callbackQuery(/^nope:([a-z0-9]+)$/, async (ctx) => {
  const group = groups.get(ctx.match![1]);
  await ctx.answerCallbackQuery({ text: "Ок, убрал" });
  if (group) {
    await deleteMessages(group.chatId, [group.headerId, ...group.optionIds]);
    groups.delete(ctx.match![1]);
  }
});

bot.catch((err) => console.error("Bot error:", err.error));

// Плановые уведомления (время сервера/контейнера; по умолчанию UTC).
// Новинки по вкусу — понедельник 09:00; напоминание посмотреть — пятница 19:00.
cron.schedule("0 9 * * 1", () => {
  console.log("[cron] weekly releases");
  sendWeeklyReleases().catch((e) => console.error("weekly releases:", e));
});
cron.schedule("0 19 * * 5", () => {
  console.log("[cron] watch reminders");
  sendWatchReminders().catch((e) => console.error("watch reminders:", e));
});

bot.start({
  onStart: (info) => console.log(`🤖 Бот @${info.username} запущен`),
});
