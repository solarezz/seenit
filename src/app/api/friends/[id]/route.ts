import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notify";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/friends/[id] → принять входящий запрос (я — получатель B)
export async function PATCH(req: Request, { params }: Ctx) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const fr = await prisma.friendship.findFirst({
    where: { id, userBId: me.id, status: "pending" },
  });
  if (!fr) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.friendship.update({ where: { id }, data: { status: "accepted" } });

  // Уведомляем инициатора
  await notifyUser(fr.userAId, "newFriend", `🎉 <b>${me.name}</b> принял(а) твой запрос в друзья.`);

  return NextResponse.json({ ok: true });
}

// DELETE /api/friends/[id] → отклонить запрос или удалить из друзей
export async function DELETE(req: Request, { params }: Ctx) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const fr = await prisma.friendship.findFirst({
    where: { id, OR: [{ userAId: me.id }, { userBId: me.id }] },
  });
  if (!fr) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.friendship.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
