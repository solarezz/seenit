"use client";

// Клиентские хелперы для работы внутри Telegram Mini App.

interface TgWebApp {
  initData: string;
  initDataUnsafe?: { user?: { id: number; first_name?: string; username?: string } };
  ready: () => void;
  expand: () => void;
  colorScheme?: "light" | "dark";
  HapticFeedback?: { impactOccurred: (s: "light" | "medium" | "heavy") => void };
  showAlert?: (msg: string) => void;
  openTelegramLink?: (url: string) => void;
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
