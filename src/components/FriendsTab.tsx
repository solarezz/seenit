"use client";

import { useCallback, useEffect, useState } from "react";
import { api, haptic, shareViaTelegram } from "@/lib/client";
import type { FeedItem, FriendEntry, PublicUser, TitleBrief } from "@/lib/types";
import Poster from "./Poster";
import Emoji from "./Emoji";
import TogetherSheet from "./TogetherSheet";
import TitleDetailSheet from "./TitleDetailSheet";

type Sub = "friends" | "feed";
type UserResult = PublicUser & { relation: string | null };

export default function FriendsTab({
  botUsername,
  myId,
}: {
  botUsername: string;
  myId: string;
}) {
  const [sub, setSub] = useState<Sub>("friends");

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 flex gap-2 bg-[var(--tg-bg)] px-4 py-3">
        {(
          [
            { k: "friends", label: "Друзья" },
            { k: "feed", label: "Лента" },
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => {
              haptic("light");
              setSub(t.k);
            }}
            className="rounded-full px-4 py-1.5 text-sm font-medium"
            style={{
              background: sub === t.k ? "var(--tg-accent)" : "var(--tg-card)",
              color: sub === t.k ? "#fff" : "var(--tg-text)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "friends" ? <FriendsList botUsername={botUsername} myId={myId} /> : <Feed />}
    </div>
  );
}

function FriendsList({ botUsername, myId }: { botUsername: string; myId: string }) {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendEntry[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [together, setTogether] = useState<PublicUser | null>(null);
  const [detailTitle, setDetailTitle] = useState<TitleBrief | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ friends: FriendEntry[]; incoming: FriendEntry[]; outgoing: FriendEntry[] }>(
        "/api/friends",
      );
      setFriends(d.friends);
      setIncoming(d.incoming);
      setOutgoing(d.outgoing);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const d = await api<{ results: UserResult[] }>(`/api/users/search?q=${encodeURIComponent(q)}`);
        setResults(d.results);
      } catch {
        setResults([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  async function request(u: UserResult) {
    haptic("medium");
    setRequested((s) => new Set(s).add(u.id));
    try {
      await api("/api/friends", { method: "POST", body: JSON.stringify({ username: u.username }) });
    } catch {
      /* ignore */
    }
  }

  async function accept(id: string) {
    haptic("medium");
    setIncoming((p) => p.filter((i) => i.id !== id));
    try {
      await api(`/api/friends/${id}`, { method: "PATCH" });
      load();
    } catch {
      load();
    }
  }

  async function remove(id: string) {
    haptic("medium");
    setFriends((p) => p.filter((i) => i.id !== id));
    setIncoming((p) => p.filter((i) => i.id !== id));
    setOutgoing((p) => p.filter((i) => i.id !== id));
    try {
      await api(`/api/friends/${id}`, { method: "DELETE" });
    } catch {
      load();
    }
  }

  const inviteLink = botUsername
    ? `https://t.me/${botUsername}?startapp=friend_${myId}`
    : "";

  return (
    <div className="px-4">
      {/* Пригласить по ссылке */}
      <button
        onClick={() =>
          shareViaTelegram(inviteLink, "Заходи в Seenit — вместе будем собирать вишлист фильмов 🎬")
        }
        disabled={!inviteLink}
        className="mb-3 mt-1 w-full rounded-xl py-3 font-medium disabled:opacity-50"
        style={{ background: "var(--tg-accent)", color: "#fff" }}
      >
        🔗 Пригласить друга
      </button>

      {/* Поиск по username */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск по @username"
        className="mb-2 w-full rounded-xl bg-[var(--tg-card)] px-4 py-2.5 text-base outline-none placeholder:text-[var(--tg-hint)]"
      />
      {results.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {results.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-xl bg-[var(--tg-card)] p-2.5">
              <Avatar name={u.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                {u.username && <p className="text-xs text-[var(--tg-hint)]">@{u.username}</p>}
              </div>
              {u.relation === "accepted" ? (
                <span className="text-xs text-[var(--tg-hint)]">В друзьях</span>
              ) : u.relation === "pending" || requested.has(u.id) ? (
                <span className="text-xs text-[var(--tg-hint)]">Запрос отправлен</span>
              ) : (
                <button
                  onClick={() => request(u)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{ background: "var(--tg-accent)", color: "#fff" }}
                >
                  Добавить
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Входящие запросы */}
      {incoming.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-[var(--tg-hint)]">Запросы в друзья</h2>
          <ul className="space-y-1.5">
            {incoming.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-xl bg-[var(--tg-card)] p-2.5">
                <Avatar name={f.user.name} />
                <span className="min-w-0 flex-1 truncate text-sm">{f.user.name}</span>
                <button
                  onClick={() => accept(f.id)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{ background: "var(--tg-accent)", color: "#fff" }}
                >
                  Принять
                </button>
                <button
                  onClick={() => remove(f.id)}
                  className="rounded-lg px-2 py-1.5 text-xs text-[var(--tg-hint)]"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Список друзей */}
      <h2 className="mb-2 text-sm font-semibold text-[var(--tg-hint)]">
        Мои друзья {friends.length > 0 && `· ${friends.length}`}
      </h2>
      {friends.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--tg-hint)]">
          Пока никого. Пригласи по ссылке или найди по @username.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {friends.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-xl bg-[var(--tg-card)] p-2.5">
              <Avatar name={f.user.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.user.name}</p>
                {f.user.username && <p className="text-xs text-[var(--tg-hint)]">@{f.user.username}</p>}
              </div>
              <button
                onClick={() => setTogether(f.user)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium"
                style={{ background: "var(--tg-card)", border: "1px solid var(--tg-border)" }}
              >
                🍿 Вместе
              </button>
              <button onClick={() => remove(f.id)} className="p-1 text-[var(--tg-hint)]" aria-label="Удалить">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {outgoing.length > 0 && (
        <p className="mt-4 text-xs text-[var(--tg-hint)]">
          Ожидают подтверждения: {outgoing.map((o) => o.user.name).join(", ")}
        </p>
      )}

      <TogetherSheet
        friend={together}
        onClose={() => setTogether(null)}
        onOpenTitle={(t) => {
          setTogether(null);
          setDetailTitle(t);
        }}
      />
      <TitleDetailSheet open={detailTitle} onClose={() => setDetailTitle(null)} />
    </div>
  );
}

function Feed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    api<{ items: FeedItem[] }>("/api/feed")
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  async function take(it: FeedItem) {
    const key = `${it.title.type}:${it.title.tmdbId}`;
    haptic("medium");
    setAdded((s) => new Set(s).add(key));
    try {
      await api("/api/wishlist", {
        method: "POST",
        body: JSON.stringify({ tmdbId: it.title.tmdbId, type: it.title.type }),
      });
    } catch {
      /* ignore */
    }
  }

  if (loading) return <p className="py-10 text-center text-[var(--tg-hint)]">Загружаю…</p>;
  if (items.length === 0)
    return (
      <div className="px-6 py-16 text-center text-[var(--tg-hint)]">
        <p><Emoji e="✨" size={40} /></p>
        <p className="mt-3">Тут появится активность друзей.</p>
      </div>
    );

  return (
    <ul className="space-y-3 px-4">
      {items.map((it) => {
        const key = `${it.title.type}:${it.title.tmdbId}`;
        return (
          <li key={it.id} className="flex gap-3 rounded-2xl bg-[var(--tg-card)] p-3">
            <Poster src={it.title.poster} alt={it.title.title} className="w-12 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{it.user.name}</span>{" "}
                <span className="text-[var(--tg-hint)]">{it.label}</span>
                {it.meta?.stars ? <span> · {"★".repeat(it.meta.stars)}</span> : null}
              </p>
              <p className="truncate text-sm">{it.title.title}</p>
            </div>
            <button
              onClick={() => take(it)}
              disabled={added.has(key)}
              className="self-center rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{
                background: added.has(key) ? "transparent" : "var(--tg-accent)",
                color: added.has(key) ? "var(--tg-hint)" : "#fff",
              }}
            >
              {added.has(key) ? "✓" : "+ себе"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tg-accent)] text-sm text-white">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
