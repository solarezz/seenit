import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { posterUrl } from "@/lib/tmdb";

// GET /api/together?friendId= → тайтлы, которые есть в вишлистах у обоих
export async function GET(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const friendId = new URL(req.url).searchParams.get("friendId") ?? "";
  if (!friendId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Только для подтверждённых друзей
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { userAId: me.id, userBId: friendId },
        { userAId: friendId, userBId: me.id },
      ],
    },
  });
  if (!friendship) return NextResponse.json({ error: "not_friends" }, { status: 403 });

  const [mine, theirs] = await Promise.all([
    prisma.wishlistItem.findMany({ where: { userId: me.id }, select: { titleId: true } }),
    prisma.wishlistItem.findMany({ where: { userId: friendId }, select: { titleId: true } }),
  ]);

  const theirSet = new Set(theirs.map((t) => t.titleId));
  const commonIds = mine.map((m) => m.titleId).filter((id) => theirSet.has(id));

  if (commonIds.length === 0) return NextResponse.json({ items: [] });

  const titles = await prisma.title.findMany({ where: { id: { in: commonIds } } });

  return NextResponse.json({
    items: titles.map((t) => ({
      tmdbId: t.tmdbId,
      type: t.type,
      title: t.title,
      year: t.year,
      poster: posterUrl(t.poster, "w185"),
    })),
  });
}
