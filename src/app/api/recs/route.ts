import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTitle, posterUrl, type TmdbType } from "@/lib/tmdb";
import { upsertTitle } from "@/lib/titles";
import { publicUser } from "@/lib/serialize";
import { notifyUser } from "@/lib/notify";

// GET /api/recs → входящие рекомендации от друзей (свежие сверху)
export async function GET(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const recs = await prisma.rec.findMany({
    where: { toId: me.id, status: { in: ["new", "added"] } },
    include: { title: true, from: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    items: recs.map((r) => ({
      id: r.id,
      status: r.status,
      comment: r.comment,
      createdAt: r.createdAt,
      from: publicUser(r.from),
      title: {
        tmdbId: r.title.tmdbId,
        type: r.title.type,
        title: r.title.title,
        year: r.title.year,
        poster: posterUrl(r.title.poster, "w185"),
      },
    })),
  });
}

// POST /api/recs { toUserId, tmdbId, type, comment? } → порекомендовать другу
export async function POST(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    toUserId?: string;
    tmdbId?: number;
    type?: TmdbType;
    comment?: string;
  };
  if (!body.toUserId || !body.tmdbId || (body.type !== "movie" && body.type !== "tv")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Рекомендовать можно только другу (accepted)
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { userAId: me.id, userBId: body.toUserId },
        { userAId: body.toUserId, userBId: me.id },
      ],
    },
  });
  if (!friendship) return NextResponse.json({ error: "not_friends" }, { status: 403 });

  const meta = await getTitle(body.tmdbId, body.type);
  const title = await upsertTitle(meta);

  await prisma.rec.create({
    data: {
      fromId: me.id,
      toId: body.toUserId,
      titleId: title.id,
      comment: body.comment?.trim() || null,
    },
  });

  const label = `${meta.title}${meta.year ? ` (${meta.year})` : ""}`;
  await notifyUser(
    body.toUserId,
    "friendRec",
    `🎬 <b>${me.name}</b> рекомендует тебе «${label}»` +
      (body.comment?.trim() ? `\n💬 ${body.comment.trim()}` : ""),
  );

  return NextResponse.json({ ok: true });
}
