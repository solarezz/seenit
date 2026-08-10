"use client";

// Клиентские хелперы для работы внутри Telegram Mini App.

interface TgWebApp {
  initData: string;
  initDataUnsafe?: {
    user?: { id: number; first_name?: string; username?: string };
    start_param?: string;
  };
  ready: () => void;
  expand: () => void;
  colorScheme?: "light" | "dark";
  HapticFeedback?: { impactOccurred: (s: "light" | "medium" | "heavy") => void };
  showAlert?: (msg: string) => void;
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export function webApp(): TgWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function getInitData(): string {
  return webApp()?.initData ?? "";
}

/** fetch с автоматической подстановкой Telegram-подписи. */
export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `tma ${getInitData()}`,
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function haptic(kind: "light" | "medium" | "heavy" = "light") {
  webApp()?.HapticFeedback?.impactOccurred(kind);
}

/** Открыть внешнюю ссылку (напр. трейлер на YouTube). */
export function openExternal(url: string) {
  const wa = webApp();
  if (wa?.openLink) wa.openLink(url);
  else window.open(url, "_blank");
}

/** start_param из deep-link (?startapp=...). */
export function getStartParam(): string {
  return webApp()?.initDataUnsafe?.start_param ?? "";
}

/** Открывает системный шэринг Telegram с готовым текстом и ссылкой. */
export function shareViaTelegram(url: string, text: string) {
  const wa = webApp();
  const share = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  if (wa?.openTelegramLink) wa.openTelegramLink(share);
  else window.open(share, "_blank");
}
