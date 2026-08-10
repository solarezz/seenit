import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTitleDetail, posterUrl, type TmdbType } from "@/lib/tmdb";

type Ctx = { params: Promise<{ type: string; tmdbId: string }> };

// GET /api/title/[type]/[tmdbId] → детали + флаги «в вишлисте/в любимых»
export async function GET(req: Request, { params }: Ctx) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { type, tmdbId } = await params;
  if (type !== "movie" && type !== "tv") return NextResponse.json({ error: "bad_type" }, { status: 400 });
  const id = Number(tmdbId);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const d = await getTitleDetail(id, type as TmdbType);

  // Есть ли уже у пользователя (по кэш-тайтлу)
  const cached = await prisma.title.findUnique({ where: { tmdbId_type: { tmdbId: id, type: type as TmdbType } } });
  let inWishlist = false;
  let inFavorites = false;
  if (cached) {
    const [w, f] = await Promise.all([
      prisma.wishlistItem.findUnique({ where: { userId_titleId: { userId: me.id, titleId: cached.id } } }),
      prisma.favorite.findUnique({ where: { userId_titleId: { userId: me.id, titleId: cached.id } } }),
    ]);
    inWishlist = Boolean(w);
    inFavorites = Boolean(f);
  }

  return NextResponse.json({
    tmdbId: d.tmdbId,
    type: d.type,
    title: d.title,
    year: d.year,
    poster: posterUrl(d.poster, "w342"),
    overview: d.overview,
    genres: d.genreNames,
    rating: d.rating,
    runtime: d.runtime,
    seasons: d.seasons,
    cast: d.cast,
    trailerKey: d.trailerKey,
    inWishlist,
    inFavorites,
  });
}
