import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/recs/[id] { status: "added" | "dismissed" }
// "added" — заодно кладём тайтл в вишлист получателя.
export async function PATCH(req: Request, { params }: Ctx) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = (await req.json().catch(() => ({}))) as { status?: "added" | "dismissed" };
  if (status !== "added" && status !== "dismissed") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const rec = await prisma.rec.findFirst({ where: { id, toId: me.id } });
  if (!rec) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (status === "added") {
    await prisma.wishlistItem.upsert({
      where: { userId_titleId: { userId: me.id, titleId: rec.titleId } },
      create: { userId: me.id, titleId: rec.titleId },
      update: {},
    });
    await prisma.activity.create({ data: { userId: me.id, type: "added", titleId: rec.titleId } });
  }

  await prisma.rec.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true });
}
