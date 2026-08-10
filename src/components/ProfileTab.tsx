"use client";

import { useCallback, useEffect, useState } from "react";
import { api, haptic } from "@/lib/client";
import type { ProfileData, WishlistItem } from "@/lib/types";
import Poster from "./Poster";

interface FavItem {
  id: string;
  title: WishlistItem["title"];
}

const NOTIF_LABELS: { key: string; label: string }[] = [
  { key: "friendRec", label: "Друг порекомендовал фильм" },
  { key: "newFriend", label: "Новый друг" },
  { key: "newReleases", label: "Новинки по вкусу (раз в неделю)" },
  { key: "watchReminder", label: "Напоминание посмотреть" },
];

export default function ProfileTab() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [favs, setFavs] = useState<FavItem[]>([]);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const [p, f] = await Promise.all([
        api<ProfileData>("/api/profile"),
        api<{ items: FavItem[] }>("/api/favorites"),
      ]);
      setData(p);
      setPrefs(p.notifPrefs ?? {});
      setFavs(f.items);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(key: string) {
    haptic("light");
    const next = { ...prefs, [key]: prefs[key] === false ? true : false };
    setPrefs(next);
    try {
      await api("/api/profile", { method: "PATCH", body: JSON.stringify({ notifPrefs: { [key]: next[key] } }) });
    } catch {
      /* ignore */
    }
  }

  async function removeFav(id: string) {
    haptic("medium");
    setFavs((p) => p.filter((f) => f.id !== id));
    try {
      await api(`/api/favorites/${id}`, { method: "DELETE" });
    } catch {
      load();
    }
  }

  if (!data) return <p className="py-10 text-center text-[var(--tg-hint)]">Загружаю…</p>;

  return (
    <div className="px-4 pb-24">
      {/* Шапка */}
      <div className="flex items-center gap-3 py-2">
        {data.user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.user.avatarUrl} alt={data.user.name} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--tg-accent)] text-2xl text-white">
            {data.user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <p className="text-lg font-semibold">{data.user.name}</p>
          {data.user.username && <p className="text-sm text-[var(--tg-hint)]">@{data.user.username}</p>}
        </div>
      </div>

      {/* Статистика */}
      <div className="my-3 grid grid-cols-4 gap-2 text-center">
        <Stat n={data.stats.wishlist} label="в вишлисте" />
        <Stat n={data.stats.watched} label="просмотрено" />
        <Stat n={data.stats.avgRating ?? "—"} label="ср. оценка" />
        <Stat n={data.stats.friends} label="друзей" />
      </div>

      {/* Любимые */}
      <h2 className="mb-2 mt-4 text-sm font-semibold text-[var(--tg-hint)]">
        Любимые {favs.length > 0 && `· ${favs.length}`}
      </h2>
      {favs.length === 0 ? (
        <p className="py-4 text-sm text-[var(--tg-hint)]">
          Добавляй сюда любимое из вишлиста (❤ на карточке) — это витрина для друзей.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2.5">
          {favs.map((f) => (
            <li key={f.id} className="relative">
              <div className="overflow-hidden rounded-xl">
                <Poster src={f.title.poster} alt={f.title.title} className="w-full" />
              </div>
              <button
                onClick={() => removeFav(f.id)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                aria-label="Убрать из любимых"
              >
                ✕
              </button>
              <p className="mt-1 line-clamp-2 text-xs leading-tight">{f.title.title}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Настройки уведомлений */}
      <h2 className="mb-2 mt-6 text-sm font-semibold text-[var(--tg-hint)]">Уведомления</h2>
      <ul className="overflow-hidden rounded-2xl bg-[var(--tg-card)]">
        {NOTIF_LABELS.map((n, i) => {
          const on = prefs[n.key] !== false;
          return (
            <li
              key={n.key}
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--tg-border)" }}
            >
              <span className="pr-3 text-sm">{n.label}</span>
              <button
                onClick={() => toggle(n.key)}
                className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
                style={{ background: on ? "var(--tg-accent)" : "var(--tg-hint)" }}
                aria-label={n.label}
              >
                <span
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
                  style={{ left: on ? "22px" : "2px" }}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="rounded-xl bg-[var(--tg-card)] py-2.5">
      <p className="text-lg font-semibold">{n}</p>
      <p className="text-[10px] text-[var(--tg-hint)]">{label}</p>
    </div>
  );
}
