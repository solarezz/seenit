import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRecommendations, getTrending, posterUrl, type TmdbTitle } from "@/lib/tmdb";

const keyOf = (t: { type: string; tmdbId: number }) => `${t.type}:${t.tmdbId}`;

function serialize(list: TmdbTitle[]) {
  return list.map((t) => ({
    tmdbId: t.tmdbId,
    type: t.type,
    title: t.title,
    year: t.year,
    poster: posterUrl(t.poster, "w185"),
    overview: t.overview,
  }));
}

// GET /api/recommendations?mode=wishlist|trending
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const mode = new URL(req.url).searchParams.get("mode") ?? "wishlist";

  // Всё, что уже в вишлисте — исключаем из выдачи
  const wl = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    include: { title: { select: { tmdbId: true, type: true } } },
    orderBy: { addedAt: "desc" },
  });
  const exclude = new Set(wl.map((i) => keyOf(i.title)));

  // Новинки/популярное
  if (mode === "trending") {
    const trending = await getTrending(40);
    return NextResponse.json({
      mode: "trending",
      results: serialize(trending.filter((t) => !exclude.has(keyOf(t))).slice(0, 30)),
    });
  }

  // По вишлисту: если пусто — честно говорим и отдаём тренды как запасной вариант
  if (wl.length === 0) {
    const trending = await getTrending(30);
    return NextResponse.json({
      mode: "wishlist",
      empty: true,
      results: serialize(trending.slice(0, 20)),
    });
  }

  // Берём до 10 недавних тайтлов как «сиды» и агрегируем рекомендации TMDB
  const seeds = wl.slice(0, 10);
  const lists = await Promise.all(
    seeds.map((s) => getRecommendations(s.title.tmdbId, s.title.type, 15).catch(() => [])),
  );

  // Скор = сколько сидов порекомендовали этот тайтл (чаще → выше)
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

  let ranked = [...scored.values()].sort((a, b) => b.score - a.score).map((x) => x.t).slice(0, 30);

  // Подстраховка: если TMDB ничего не вернул — тренды
  if (ranked.length === 0) ranked = (await getTrending(20)).filter((t) => !exclude.has(keyOf(t)));

  return NextResponse.json({ mode: "wishlist", results: serialize(ranked) });
}
