import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getBotUsername } from "@/lib/botinfo";

// Публичные параметры клиента (имя бота для инвайт-ссылок).
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const botUsername = await getBotUsername();
  return NextResponse.json({ botUsername });
}
