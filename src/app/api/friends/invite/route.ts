import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notify";

// POST /api/friends/invite { code } — принять инвайт по ссылке (startapp=friend_<userId>).
// Оба согласны (A поделился ссылкой, B открыл), поэтому дружба сразу accepted.
export async function POST(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const match = /^friend_(.+)$/.exec(code ?? "");
  if (!match) return NextResponse.json({ error: "bad_code" }, { status: 400 });

  const inviterId = match[1];
  if (inviterId === me.id) return NextResponse.json({ error: "self" }, { status: 400 });

  const inviter = await prisma.user.findUnique({ where: { id: inviterId } });
  if (!inviter) return NextResponse.json({ error: "inviter_not_found" }, { status: 404 });

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId: me.id, userBId: inviterId },
        { userAId: inviterId, userBId: me.id },
      ],
    },
  });

  if (existing) {
    if (existing.status !== "accepted") {
      await prisma.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } });
    }
  } else {
    await prisma.friendship.create({ data: { userAId: inviterId, userBId: me.id, status: "accepted" } });
  }

  await notifyUser(inviterId, "newFriend", `🎉 <b>${me.name}</b> присоединился(ась) по твоей ссылке — вы теперь друзья.`);

  return NextResponse.json({ ok: true, inviter: { name: inviter.name } });
}
