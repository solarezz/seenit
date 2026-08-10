import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publicUser } from "@/lib/serialize";

// GET /api/friends → { friends, incoming, outgoing }
export async function GET(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.friendship.findMany({
    where: { OR: [{ userAId: me.id }, { userBId: me.id }] },
    include: { userA: true, userB: true },
    orderBy: { createdAt: "desc" },
  });

  const friends = [];
  const incoming = []; // мне прислали запрос (я — B, статус pending)
  const outgoing = []; // я отправил запрос (я — A, статус pending)

  for (const r of rows) {
    const other = r.userAId === me.id ? r.userB : r.userA;
    const entry = { id: r.id, user: publicUser(other) };
    if (r.status === "accepted") friends.push(entry);
    else if (r.userBId === me.id) incoming.push(entry);
    else outgoing.push(entry);
  }

  return NextResponse.json({ friends, incoming, outgoing });
}

// POST /api/friends { username } → отправить запрос в друзья
export async function POST(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { username } = (await req.json().catch(() => ({}))) as { username?: string };
  const handle = (username ?? "").trim().replace(/^@/, "");
  if (!handle) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const target = await prisma.user.findFirst({
    where: { username: { equals: handle, mode: "insensitive" } },
  });
  if (!target) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  if (target.id === me.id) return NextResponse.json({ error: "self" }, { status: 400 });

  // Уже есть связь в любую сторону?
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId: me.id, userBId: target.id },
        { userAId: target.id, userBId: me.id },
      ],
    },
  });
  if (existing) return NextResponse.json({ error: "already_exists", status: existing.status }, { status: 409 });

  await prisma.friendship.create({ data: { userAId: me.id, userBId: target.id, status: "pending" } });
  return NextResponse.json({ ok: true });
}
