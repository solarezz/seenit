import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTitle, posterUrl, type TmdbType } from "@/lib/tmdb";
import { upsertTitle } from "@/lib/titles";

// GET /api/wishlist?status=want|watching|watched — список вишлиста пользователя
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const status = new URL(req.url).searchParams.get("status") as
    | "want"
    | "watching"
    | "watched"
    | null;

  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id, ...(status ? { status } : {}) },
    include: { title: true },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      status: i.status,
      stars: i.stars,
      addedAt: i.addedAt,
      title: {
        tmdbId: i.title.tmdbId,
        type: i.title.type,
        title: i.title.title,
        year: i.title.year,
        poster: posterUrl(i.title.poster, "w185"),
      },
    })),
  });
}

// POST /api/wishlist { tmdbId, type } — добавить в вишлист
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { tmdbId?: number; type?: TmdbType };
  if (!body.tmdbId || (body.type !== "movie" && body.type !== "tv")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const meta = await getTitle(body.tmdbId, body.type);
  const title = await upsertTitle(meta);

  const item = await prisma.wishlistItem.upsert({
    where: { userId_titleId: { userId: user.id, titleId: title.id } },
    create: { userId: user.id, titleId: title.id },
    update: {}, // уже есть — ничего не меняем
    include: { title: true },
  });

  // Лента активности
  await prisma.activity.create({
    data: { userId: user.id, type: "added", titleId: title.id },
  });

  return NextResponse.json({
    id: item.id,
    status: item.status,
    stars: item.stars,
    title: {
      tmdbId: item.title.tmdbId,
      type: item.title.type,
      title: item.title.title,
      year: item.title.year,
      poster: posterUrl(item.title.poster, "w185"),
    },
  });
}
