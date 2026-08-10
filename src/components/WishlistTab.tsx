"use client";

import { useCallback, useEffect, useState } from "react";
import { api, haptic } from "@/lib/client";
import type { WishStatus, WishlistItem } from "@/lib/types";
import Poster from "./Poster";
import StarRating from "./StarRating";
import SearchOverlay from "./SearchOverlay";

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

export default function WishlistTab() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [filter, setFilter] = useState<WishStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: WishlistItem[] }>("/api/wishlist");
      setItems(data.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shown = filter === "all" ? items : items.filter((i) => i.status === filter);

  async function patch(id: string, body: { status?: WishStatus; stars?: number }) {
    // Оптимистично
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

  return (
    <div className="pb-24">
      {/* Фильтры */}
      <div className="sticky top-0 z-10 flex gap-2 overflow-x-auto bg-[var(--tg-bg)] px-4 py-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              haptic("light");
              setFilter(f.key);
            }}
            className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: filter === f.key ? "var(--tg-accent)" : "var(--tg-card)",
              color: filter === f.key ? "#fff" : "var(--tg-text)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="py-10 text-center text-[var(--tg-hint)]">Загружаю…</p>}

      {!loading && shown.length === 0 && (
        <div className="px-6 py-16 text-center text-[var(--tg-hint)]">
          <p className="text-4xl">🍿</p>
          <p className="mt-3">Тут пока пусто.</p>
          <p className="text-sm">Нажми «+» или напиши боту название фильма.</p>
        </div>
      )}

      <ul className="space-y-3 px-4">
        {shown.map((i) => (
          <li key={i.id} className="flex gap-3 rounded-2xl bg-[var(--tg-card)] p-3">
            <Poster src={i.title.poster} alt={i.title.title} className="w-16 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.title.title}</p>
                  <p className="text-sm text-[var(--tg-hint)]">
                    {i.title.type === "tv" ? "Сериал" : "Фильм"}
                    {i.title.year ? ` · ${i.title.year}` : ""}
                  </p>
                </div>
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
            </div>
          </li>
        ))}
      </ul>

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
    </div>
  );
}
