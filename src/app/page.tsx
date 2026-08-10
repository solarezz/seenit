"use client";

import { useEffect, useState } from "react";
import { api, webApp, getStartParam, initSafeArea } from "@/lib/client";
import WishlistTab from "@/components/WishlistTab";
import RecsTab from "@/components/RecsTab";
import InboxTab from "@/components/InboxTab";
import FriendsTab from "@/components/FriendsTab";
import ProfileTab from "@/components/ProfileTab";
import Emoji from "@/components/Emoji";

type Tab = "wishlist" | "recs" | "inbox" | "friends" | "profile";

const NAV: { key: Tab; label: string; icon: string }[] = [
  { key: "wishlist", label: "Вишлист", icon: "🎬" },
  { key: "recs", label: "Реки", icon: "✨" },
  { key: "inbox", label: "Входящие", icon: "📥" },
  { key: "friends", label: "Друзья", icon: "👥" },
  { key: "profile", label: "Профиль", icon: "👤" },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("wishlist");
  const [auth, setAuth] = useState<"loading" | "ok" | "fail">("loading");
  const [name, setName] = useState<string>("");
  const [myId, setMyId] = useState<string>("");
  const [botUsername, setBotUsername] = useState<string>("");

  useEffect(() => {
    const wa = webApp();
    wa?.ready();
    wa?.expand();
    initSafeArea();
    api<{ id: string; name: string }>("/api/me")
      .then(async (u) => {
        setName(u.name);
        setMyId(u.id);
        setAuth("ok");

        // Имя бота для инвайт-ссылок
        api<{ botUsername: string }>("/api/config")
          .then((c) => setBotUsername(c.botUsername))
          .catch(() => {});

        // Принять инвайт по deep-link (?startapp=friend_<id>)
        const code = getStartParam();
        if (code.startsWith("friend_")) {
          api("/api/friends/invite", { method: "POST", body: JSON.stringify({ code }) })
            .then(() => setTab("friends"))
            .catch(() => {});
        }
      })
      .catch(() => setAuth("fail"));
  }, []);

  if (auth === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-[var(--tg-hint)]">Загрузка…</div>;
  }

  if (auth === "fail") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-8 text-center">
        <Emoji e="🎬" size={44} />
        <p className="font-medium">Открой приложение через Telegram</p>
        <p className="text-sm text-[var(--tg-hint)]">
          Мини-апп работает только внутри бота — авторизация идёт через Telegram.
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="px-4 pb-1" style={{ paddingTop: "calc(var(--app-safe-top) + 14px)" }}>
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
      {tab === "inbox" && <InboxTab />}
      {tab === "friends" && <FriendsTab botUsername={botUsername} myId={myId} />}
      {tab === "profile" && <ProfileTab />}

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
