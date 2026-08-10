import { prisma } from "./db";

// Прямая отправка сообщения через Telegram Bot API (без импорта grammy-инстанса,
// чтобы работало и из API-роутов Next.js).

type NotifType = "friendRec" | "newFriend" | "newReleases" | "watchReminder";

function api(method: string): string {
  return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
}

export async function tgSend(
  tgId: bigint | string,
  text: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  try {
    await fetch(api("sendMessage"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: tgId.toString(),
        text,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        ...extra,
      }),
    });
  } catch {
    // уведомления — best-effort, не роняем основной поток
  }
}

/** Шлёт уведомление пользователю, если он его не отключил в настройках. */
export async function notifyUser(
  userId: string,
  type: NotifType,
  text: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const prefs = (user.notifPrefs ?? {}) as Record<string, boolean>;
  if (prefs[type] === false) return;
  await tgSend(user.tgId, text, extra);
}
