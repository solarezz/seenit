"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, haptic } from "@/lib/client";
import type { TitleBrief, WishStatus, WishlistItem } from "@/lib/types";
import Poster from "./Poster";
import StarRating from "./StarRating";
import SearchOverlay from "./SearchOverlay";
import RecommendSheet from "./RecommendSheet";
import TitleDetailSheet from "./TitleDetailSheet";
import Emoji from "./Emoji";

const FILTERS: { key: WishStatus | "all"; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "want", label: "Хочу" },
  { key: "watching", label: "Смотрю" },
  { key: "watched", label: "Посмотрел" },
];

const STATUS_LABEL: Record<WishStatus, string> = {
  want: "Хочу посмотреть",
  watching: "Смотрю",
  watched: "Посмотрел",
};

type Sort = "added" | "rating" | "alpha";
type TypeFilter = "all" | "movie" | "tv";

export default function WishlistTab() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [filter, setFilter] = useState<WishStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<Sort>("added");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recTitle, setRecTitle] = useState<TitleBrief | null>(null);
  const [detailTitle, setDetailTitle] = useState<TitleBrief | null>(null);
  const [pick, setPick] = useState<WishlistItem | null>(null);
  // key `type:tmdbId` → id записи favorite (для тоггла ❤)
  const [favMap, setFavMap] = useState<Map<string, string>>(new Map());

  const keyOf = (t: TitleBrief) => `${t.type}:${t.tmdbId}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, favs] = await Promise.all([
        api<{ items: WishlistItem[] }>("/api/wishlist"),
        api<{ items: { id: string; title: TitleBrief }[] }>("/api/favorites"),
      ]);
      setItems(data.items);
      setFavMap(new Map(favs.items.map((f) => [`${f.title.type}:${f.title.tmdbId}`, f.id])));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    let list = items;
    if (filter !== "all") list = list.filter((i) => i.status === filter);
    if (typeFilter !== "all") list = list.filter((i) => i.title.type === typeFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((i) => i.title.title.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sort === "rating") sorted.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
    else if (sort === "alpha") sorted.sort((a, b) => a.title.title.localeCompare(b.title.title, "ru"));
    // "added" — сохраняем порядок с сервера (addedAt desc)
    return sorted;
  }, [items, filter, typeFilter, query, sort]);

  async function patch(id: string, body: { status?: WishStatus; stars?: number }) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, ...(body.status ? { status: body.status } : {}), ...(body.stars != null ? { stars: body.stars } : {}) }
          : i,
      ),
    );
    try {
      await api(`/api/wishlist/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    } catch {
      load();
    }
  }

  async function remove(id: string) {
    haptic("medium");
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await api(`/api/wishlist/${id}`, { method: "DELETE" });
    } catch {
      load();
    }
  }

  async function toggleFav(title: TitleBrief) {
    haptic("light");
    const k = keyOf(title);
    const existingId = favMap.get(k);
    if (existingId) {
      setFavMap((m) => {
        const n = new Map(m);
        n.delete(k);
        return n;
      });
      try {
        await api(`/api/favorites/${existingId}`, { method: "DELETE" });
      } catch {
        load();
      }
    } else {
      try {
        const res = await api<{ id: string }>("/api/favorites", {
          method: "POST",
          body: JSON.stringify({ tmdbId: title.tmdbId, type: title.type }),
        });
        setFavMap((m) => new Map(m).set(k, res.id));
      } catch {
        load();
      }
    }
  }

  function pickForMe() {
    haptic("medium");
    const pool = items.filter((i) => i.status === "want");
    const from = pool.length > 0 ? pool : shown;
    if (from.length === 0) return;
    setPick(from[Math.floor(Math.random() * from.length)]);
  }

  return (
    <div className="pb-24">
      {/* Фильтры по статусу */}
      <div className="sticky z-10 bg-[var(--tg-bg)] px-4 pt-3" style={{ top: "var(--app-safe-top)" }}>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                haptic("light");
                setFilter(f.key);
              }}
              className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium"
              style={{
                background: filter === f.key ? "var(--tg-accent)" : "var(--tg-card)",
                color: filter === f.key ? "#fff" : "var(--tg-text)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Поиск + сортировка + тип */}
        <div className="flex gap-2 pb-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск в вишлисте"
            className="min-w-0 flex-1 rounded-xl bg-[var(--tg-card)] px-3 py-2 text-sm outline-none placeholder:text-[var(--tg-hint)]"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-xl bg-[var(--tg-card)] px-2 py-2 text-sm outline-none"
          >
            <option value="added">Новые</option>
            <option value="rating">Оценка</option>
            <option value="alpha">А–Я</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="rounded-xl bg-[var(--tg-card)] px-2 py-2 text-sm outline-none"
          >
            <option value="all">Всё</option>
            <option value="movie">Фильмы</option>
            <option value="tv">Сериалы</option>
          </select>
        </div>
      </div>

      {loading && <p className="py-10 text-center text-[var(--tg-hint)]">Загружаю…</p>}

      {!loading && shown.length === 0 && (
        <div className="px-6 py-16 text-center text-[var(--tg-hint)]">
          <p><Emoji e="🍿" size={40} /></p>
          <p className="mt-3">{query.trim() ? "Ничего не найдено." : "Тут пока пусто."}</p>
          {!query.trim() && <p className="text-sm">Нажми «+» или напиши боту название фильма.</p>}
        </div>
      )}

      <ul className="space-y-3 px-4">
        {shown.map((i) => (
          <li key={i.id} className="flex gap-3 rounded-2xl bg-[var(--tg-card)] p-3">
            <button onClick={() => setDetailTitle(i.title)} className="shrink-0" aria-label="Детали">
              <Poster src={i.title.poster} alt={i.title.title} className="w-16 rounded-lg" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => setDetailTitle(i.title)} className="min-w-0 text-left">
                  <p className="truncate font-medium">{i.title.title}</p>
                  <p className="text-sm text-[var(--tg-hint)]">
                    {i.title.type === "tv" ? "Сериал" : "Фильм"}
                    {i.title.year ? ` · ${i.title.year}` : ""}
                  </p>
                </button>
                <button onClick={() => remove(i.id)} className="p-1 text-[var(--tg-hint)]" aria-label="Удалить">
                  ✕
                </button>
              </div>

              {/* Переключатель статуса */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(Object.keys(STATUS_LABEL) as WishStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => patch(i.id, { status: s })}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium"
                    style={{
                      background: i.status === s ? "var(--tg-accent)" : "transparent",
                      color: i.status === s ? "#fff" : "var(--tg-hint)",
                      border: i.status === s ? "none" : "1px solid var(--tg-border)",
                    }}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>

              {/* Оценка — только для просмотренного */}
              {i.status === "watched" && (
                <div className="mt-2">
                  <StarRating value={i.stars} onChange={(v) => patch(i.id, { status: "watched", stars: v })} />
                </div>
              )}

              {/* Действия: в любимые / порекомендовать */}
              <div className="mt-2 flex items-center gap-4 text-xs">
                <button
                  onClick={() => toggleFav(i.title)}
                  style={{ color: favMap.has(keyOf(i.title)) ? "#e0245e" : "var(--tg-hint)" }}
                >
                  {favMap.has(keyOf(i.title)) ? "♥ В любимых" : "♡ В любимые"}
                </button>
                <button onClick={() => setRecTitle(i.title)} className="text-[var(--tg-hint)]">
                  ↗ Порекомендовать
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Выбери за меня */}
      {items.some((i) => i.status === "want") && (
        <button
          onClick={pickForMe}
          className="fixed bottom-24 left-5 z-20 flex h-12 items-center gap-1.5 rounded-full px-4 text-sm font-medium shadow-lg"
          style={{ background: "var(--tg-card)", color: "var(--tg-text)" }}
        >
          🎲 Выбери за меня
        </button>
      )}

      {/* Кнопка добавления */}
      <button
        onClick={() => {
          haptic("light");
          setSearchOpen(true);
        }}
        className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full text-3xl shadow-lg"
        style={{ background: "var(--tg-accent)", color: "#fff" }}
        aria-label="Добавить фильм"
      >
        +
      </button>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onAdded={load} />
      <RecommendSheet title={recTitle} onClose={() => setRecTitle(null)} />
      <TitleDetailSheet open={detailTitle} onClose={() => setDetailTitle(null)} onChanged={load} />

      {/* Модалка «выбери за меня» */}
      {pick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-8" onClick={() => setPick(null)}>
          <div
            className="w-full max-w-xs rounded-3xl bg-[var(--tg-bg)] p-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm text-[var(--tg-hint)]">Сегодня смотрим:</p>
            <div className="mx-auto w-32 overflow-hidden rounded-xl">
              <Poster src={pick.title.poster} alt={pick.title.title} className="w-full" />
            </div>
            <p className="mt-3 font-semibold">{pick.title.title}</p>
            {pick.title.year && <p className="text-sm text-[var(--tg-hint)]">{pick.title.year}</p>}
            <div className="mt-4 flex gap-2">
              <button
                onClick={pickForMe}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium"
                style={{ background: "var(--tg-card)" }}
              >
                🎲 Другой
              </button>
              <button
                onClick={() => {
                  const t = pick.title;
                  setPick(null);
                  setDetailTitle(t);
                }}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium"
                style={{ background: "var(--tg-accent)", color: "#fff" }}
              >
                Подробнее
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
