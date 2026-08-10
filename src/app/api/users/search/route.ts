import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publicUser } from "@/lib/serialize";

// GET /api/users/search?q= — поиск пользователей по @username (для добавления в друзья)
export async function GET(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim().replace(/^@/, "") ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const users = await prisma.user.findMany({
    where: {
      username: { contains: q, mode: "insensitive" },
      NOT: { id: me.id },
    },
    take: 10,
  });

  // Помечаем существующие связи, чтобы UI показал статус
  const links = await prisma.friendship.findMany({
    where: {
      OR: [
        { userAId: me.id, userBId: { in: users.map((u) => u.id) } },
        { userBId: me.id, userAId: { in: users.map((u) => u.id) } },
      ],
    },
  });
  const statusByUser = new Map<string, string>();
  for (const l of links) {
    const other = l.userAId === me.id ? l.userBId : l.userAId;
    statusByUser.set(other, l.status);
  }

  return NextResponse.json({
    results: users.map((u) => ({ ...publicUser(u), relation: statusByUser.get(u.id) ?? null })),
  });
}
