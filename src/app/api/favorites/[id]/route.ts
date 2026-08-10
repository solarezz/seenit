import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/favorites/[id] → убрать из любимых
export async function DELETE(req: Request, { params }: Ctx) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const fav = await prisma.favorite.findFirst({ where: { id, userId: me.id } });
  if (!fav) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.favorite.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
