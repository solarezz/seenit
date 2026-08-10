import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { searchTitles, posterUrl } from "@/lib/tmdb";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ results: [] });

  const results = await searchTitles(q, 12);
  return NextResponse.json({
    results: results.map((r) => ({
      tmdbId: r.tmdbId,
      type: r.type,
      title: r.title,
      year: r.year,
      poster: posterUrl(r.poster, "w185"),
      overview: r.overview,
    })),
  });
}
