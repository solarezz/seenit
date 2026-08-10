"use client";

import { useEffect, useState } from "react";
import { api, webApp } from "@/lib/client";
import WishlistTab from "@/components/WishlistTab";
import RecsTab from "@/components/RecsTab";
import Emoji from "@/components/Emoji";

type Tab = "wishlist" | "recs" | "inbox" | "friends" | "profile";

const NAV: { key: Tab; label: string; icon: string }[] = [
  { key: "wishlist", label: "Вишлист", icon: "🎬" },
  { key: "recs", label: "Реки", icon: "✨" },
  { key: "inbox", label: "Входящие", icon: "📥" },
  { key: "friends", label: "Друзья", icon: "👥" },
  { key: "profile", label: "Профиль", icon: "👤" },
];

function Soon({ title }: { title: string }) {
  return (
    <div className="px-6 py-24 text-center text-[var(--tg-hint)]">
      <p><Emoji e="🚧" size={40} /></p>
      <p className="mt-3 font-medium text-[var(--tg-text)]">{title}</p>
      <p className="mt-1 text-sm">Появится в следующей фазе.</p>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("wishlist");
  const [auth, setAuth] = useState<"loading" | "ok" | "fail">("loading");
  const [name, setName] = useState<string>("");

  useEffect(() => {
    const wa = webApp();
    wa?.ready();
    wa?.expand();
    api<{ name: string }>("/api/me")
      .then((u) => {
        setName(u.name);
        setAuth("ok");
      })
      .catch(() => setAuth("fail"));
  }, []);

  if (auth === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-[var(--tg-hint)]">Загрузка…</div>;
  }

  if (auth === "fail") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="text-4xl">🎬</p>
        <p className="font-medium">Открой приложение через Telegram</p>
        <p className="text-sm text-[var(--tg-hint)]">
          Мини-апп работает только внутри бота — авторизация идёт через Telegram.
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="px-4 pb-1 pt-4">
        <h1 className="text-xl font-semibold">
          {tab === "wishlist" && "Мой вишлист"}
          {tab === "recs" && "Рекомендации"}
          {tab === "inbox" && "Входящие реки"}
          {tab === "friends" && "Друзья"}
          {tab === "profile" && (name || "Профиль")}
        </h1>
      </header>

      {tab === "wishlist" && <WishlistTab />}
      {tab === "recs" && <RecsTab />}
      {tab === "inbox" && <Soon title="Реки, которые прислали друзья" />}
      {tab === "friends" && <Soon title="Друзья: инвайты и поиск" />}
      {tab === "profile" && <Soon title="Профиль и любимые фильмы" />}

      {/* Нижняя навигация */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--tg-border)] bg-[var(--tg-bg)] pb-[env(safe-area-inset-bottom)]">
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => setTab(n.key)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px]"
            style={{ color: tab === n.key ? "var(--tg-accent)" : "var(--tg-hint)" }}
          >
            <Emoji e={n.icon} size={22} />
            {n.label}
          </button>
        ))}
      </nav>
    </main>
  );
}
