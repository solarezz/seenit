import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTitle, posterUrl, type TmdbType } from "@/lib/tmdb";
import { upsertTitle } from "@/lib/titles";

// GET /api/favorites → любимые (витрина профиля)
export async function GET(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const favs = await prisma.favorite.findMany({
    where: { userId: me.id },
    include: { title: true },
    orderBy: { position: "asc" },
  });

  return NextResponse.json({
    items: favs.map((f) => ({
      id: f.id,
      title: {
        tmdbId: f.title.tmdbId,
        type: f.title.type,
        title: f.title.title,
        year: f.title.year,
        poster: posterUrl(f.title.poster, "w185"),
      },
    })),
  });
}

// POST /api/favorites { tmdbId, type } → добавить в любимые
export async function POST(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { tmdbId?: number; type?: TmdbType };
  if (!body.tmdbId || (body.type !== "movie" && body.type !== "tv")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const meta = await getTitle(body.tmdbId, body.type);
  const title = await upsertTitle(meta);

  const count = await prisma.favorite.count({ where: { userId: me.id } });
  const fav = await prisma.favorite.upsert({
    where: { userId_titleId: { userId: me.id, titleId: title.id } },
    create: { userId: me.id, titleId: title.id, position: count },
    update: {},
  });
  await prisma.activity.create({ data: { userId: me.id, type: "favorited", titleId: title.id } });

  return NextResponse.json({ id: fav.id });
}
