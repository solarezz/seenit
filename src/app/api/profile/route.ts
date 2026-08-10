import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/profile → пользователь, статистика и настройки уведомлений
export async function GET(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [wishlistTotal, watched, rated, favorites, friends] = await Promise.all([
    prisma.wishlistItem.count({ where: { userId: me.id } }),
    prisma.wishlistItem.count({ where: { userId: me.id, status: "watched" } }),
    prisma.wishlistItem.aggregate({
      where: { userId: me.id, stars: { not: null } },
      _avg: { stars: true },
      _count: true,
    }),
    prisma.favorite.count({ where: { userId: me.id } }),
    prisma.friendship.count({
      where: { status: "accepted", OR: [{ userAId: me.id }, { userBId: me.id }] },
    }),
  ]);

  return NextResponse.json({
    user: { id: me.id, name: me.name, username: me.username, avatarUrl: me.avatarUrl },
    notifPrefs: me.notifPrefs,
    stats: {
      wishlist: wishlistTotal,
      watched,
      favorites,
      friends,
      avgRating: rated._avg.stars ? Number(rated._avg.stars.toFixed(1)) : null,
      ratedCount: rated._count,
    },
  });
}

// PATCH /api/profile { notifPrefs } → обновить настройки уведомлений
export async function PATCH(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { notifPrefs } = (await req.json().catch(() => ({}))) as {
    notifPrefs?: Record<string, boolean>;
  };
  if (!notifPrefs || typeof notifPrefs !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const current = (me.notifPrefs ?? {}) as Record<string, boolean>;
  const merged = { ...current, ...notifPrefs };
  await prisma.user.update({ where: { id: me.id }, data: { notifPrefs: merged } });

  return NextResponse.json({ notifPrefs: merged });
}
