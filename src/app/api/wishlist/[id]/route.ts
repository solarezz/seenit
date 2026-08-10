import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/wishlist/[id] { status?, stars? } — изменить статус/оценку
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    status?: "want" | "watching" | "watched";
    stars?: number | null;
  };

  const existing = await prisma.wishlistItem.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let stars = body.stars;
  if (stars != null) stars = Math.max(1, Math.min(5, Math.round(stars)));
  // Оценка имеет смысл только для просмотренного
  const nextStatus = body.status ?? existing.status;
  if (nextStatus !== "watched") stars = null;

  const updated = await prisma.wishlistItem.update({
    where: { id },
    data: {
      ...(body.status ? { status: body.status } : {}),
      ...(body.status !== undefined || body.stars !== undefined ? { stars } : {}),
    },
  });

  // Активность на значимые события
  if (body.status === "watched") {
    await prisma.activity.create({ data: { userId: user.id, type: "watched", titleId: existing.titleId } });
  }
  if (stars != null) {
    await prisma.activity.create({
      data: { userId: user.id, type: "rated", titleId: existing.titleId, meta: { stars } },
    });
  }

  return NextResponse.json({ id: updated.id, status: updated.status, stars: updated.stars });
}

// DELETE /api/wishlist/[id] — убрать из вишлиста
export async function DELETE(req: Request, { params }: Ctx) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.wishlistItem.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.wishlistItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
