import crypto from "crypto";
import { prisma } from "./db";

export interface TgUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}

/**
 * Проверка подписи Telegram initData.
 * Алгоритм: secret = HMAC_SHA256("WebAppData", bot_token);
 * hash = HMAC_SHA256(secret, data_check_string). См. core.telegram.org/bots/webapps.
 * Возвращает пользователя Telegram либо null, если подпись невалидна/протухла.
 */
export function verifyInitData(initData: string, maxAgeSec = 60 * 60 * 24): TgUser | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const computed = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");

  // Сравнение в постоянное время
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  // Защита от повторного использования старых initData
  const authDate = Number(params.get("auth_date"));
  if (authDate && Date.now() / 1000 - authDate > maxAgeSec) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;
  try {
    return JSON.parse(userRaw) as TgUser;
  } catch {
    return null;
  }
}

/** Находит/создаёт пользователя в БД по данным Telegram. */
export async function upsertUser(tg: TgUser) {
  const name = [tg.first_name, tg.last_name].filter(Boolean).join(" ") || tg.username || "Пользователь";
  return prisma.user.upsert({
    where: { tgId: BigInt(tg.id) },
    create: {
      tgId: BigInt(tg.id),
      username: tg.username ?? null,
      name,
      avatarUrl: tg.photo_url ?? null,
    },
    update: {
      username: tg.username ?? undefined,
      name,
      avatarUrl: tg.photo_url ?? undefined,
    },
  });
}

/**
 * Достаёт авторизованного пользователя из запроса.
 * Mini App шлёт initData в заголовке Authorization: "tma <initData>".
 */
export async function getUserFromRequest(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const initData = auth.startsWith("tma ") ? auth.slice(4) : "";
  const tg = verifyInitData(initData);
  if (!tg) return null;
  return upsertUser(tg);
}
