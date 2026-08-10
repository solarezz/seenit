import { prisma } from "./db";
import { tgSend } from "./notify";
import { getRecommendations, getTrending, type TmdbTitle } from "./tmdb";

const keyOf = (t: { type: string; tmdbId: number }) => `${t.type}:${t.tmdbId}`;

// Персональная подборка (как /api/recommendations в режиме wishlist), топ-3.
async function recommendForUser(userId: string): Promise<TmdbTitle[]> {
  const wl = await prisma.wishlistItem.findMany({
    where: { userId },
    include: { title: true },
    orderBy: { addedAt: "desc" },
  });
  const exclude = new Set(wl.map((i) => keyOf(i.title)));

  if (wl.length === 0) return (await getTrending(6)).slice(0, 3);

  const seeds = wl.slice(0, 6);
  const lists = await Promise.all(
    seeds.map((s) => getRecommendations(s.title.tmdbId, s.title.type, 10).catch(() => [])),
  );
  const scored = new Map<string, { t: TmdbTitle; score: number }>();
  for (const list of lists) {
    for (const t of list) {
      const k = keyOf(t);
      if (exclude.has(k)) continue;
      const cur = scored.get(k);
      if (cur) cur.score += 1;
      else scored.set(k, { t, score: 1 });
    }
  }
  return [...scored.values()].sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.t);
}

/** Еженедельно: «новинки по вкусу» тем, у кого включено. */
export async function sendWeeklyReleases(): Promise<void> {
  const users = await prisma.user.findMany();
  for (const u of users) {
    const prefs = (u.notifPrefs ?? {}) as Record<string, boolean>;
    if (prefs.newReleases === false) continue;
    try {
      const recs = await recommendForUser(u.id);
      if (recs.length === 0) continue;
      const list = recs.map((t) => `• ${t.title}${t.year ? ` (${t.year})` : ""}`).join("\n");
      await tgSend(u.tgId, `✨ <b>Новинки по вкусу</b>\nМожет зайти:\n${list}`);
    } catch (e) {
      console.error("weekly release failed for", u.id, e);
    }
  }
}

/** Мягкое напоминание тем, кто не заходил 7+ дней и у кого есть «хочу посмотреть». */
export async function sendWatchReminders(): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany();
  for (const u of users) {
    const prefs = (u.notifPrefs ?? {}) as Record<string, boolean>;
    if (prefs.watchReminder === false) continue;

    const recent = await prisma.activity.findFirst({
      where: { userId: u.id, createdAt: { gt: cutoff } },
    });
    if (recent) continue; // был активен — не беспокоим

    const want = await prisma.wishlistItem.findFirst({
      where: { userId: u.id, status: "want" },
      include: { title: true },
      orderBy: { addedAt: "asc" },
    });
    if (!want) continue;

    await tgSend(u.tgId, `🍿 Давно не заходил! В вишлисте ждёт «${want.title.title}». Глянем?`);
  }
}
