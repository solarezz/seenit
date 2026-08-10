// Имя бота (@username) для инвайт-ссылок. Кэшируем в памяти процесса.
let cached: string | null = null;

export async function getBotUsername(): Promise<string> {
  if (cached) return cached;
  try {
    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
    const data = (await res.json()) as { result?: { username?: string } };
    cached = data.result?.username ?? "";
  } catch {
    cached = "";
  }
  return cached;
}
