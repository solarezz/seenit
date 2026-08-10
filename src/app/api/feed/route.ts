import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { posterUrl } from "@/lib/tmdb";
import { publicUser } from "@/lib/serialize";

const ACTION_LABEL: Record<string, string> = {
  added: "добавил(а) в вишлист",
  watched: "посмотрел(а)",
  rated: "оценил(а)",
  favorited: "добавил(а) в любимые",
};

// GET /api/feed → лента активности друзей
export async function GET(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const friendships = await prisma.friendship.findMany({
    where: { status: "accepted", OR: [{ userAId: me.id }, { userBId: me.id }] },
  });
  const friendIds = friendships.map((f) => (f.userAId === me.id ? f.userBId : f.userAId));
  if (friendIds.length === 0) return NextResponse.json({ items: [] });

  const events = await prisma.activity.findMany({
    where: { userId: { in: friendIds } },
    include: { title: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    items: events.map((e) => ({
      id: e.id,
      type: e.type,
      label: ACTION_LABEL[e.type] ?? e.type,
      meta: e.meta,
      createdAt: e.createdAt,
      user: publicUser(e.user),
      title: {
        tmdbId: e.title.tmdbId,
        type: e.title.type,
        title: e.title.title,
        year: e.title.year,
        poster: posterUrl(e.title.poster, "w185"),
      },
    })),
  });
}
