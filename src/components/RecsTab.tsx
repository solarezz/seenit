"use client";

import { useCallback, useEffect, useState } from "react";
import { api, haptic } from "@/lib/client";
import type { SearchResult, TitleBrief } from "@/lib/types";
import Poster from "./Poster";
import TitleDetailSheet from "./TitleDetailSheet";
import Emoji from "./Emoji";

type Mode = "wishlist" | "trending";

const SUBTABS: { key: Mode; label: string }[] = [
  { key: "wishlist", label: "По вишлисту" },
  { key: "trending", label: "Новинки" },
];

export default function RecsTab() {
  const [mode, setMode] = useState<Mode>("wishlist");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);
  const [detailTitle, setDetailTitle] = useState<TitleBrief | null>(null);

  const keyOf = (r: SearchResult) => `${r.type}:${r.tmdbId}`;

  const load = useCallback(async (m: Mode) => {
    setLoading(true);
    setEmpty(false);
    try {
      const data = await api<{ results: SearchResult[]; empty?: boolean }>(
        `/api/recommendations?mode=${m}`,
      );
      setResults(data.results);
      setEmpty(Boolean(data.empty));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(mode);
  }, [mode, load]);

  async function add(r: SearchResult) {
    const k = keyOf(r);
    setAdding(k);
    haptic("medium");
    try {
      await api("/api/wishlist", {
        method: "POST",
        body: JSON.stringify({ tmdbId: r.tmdbId, type: r.type }),
      });
      setAdded((s) => new Set(s).add(k));
    } catch {
      // no-op
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="pb-24">
      {/* Подвкладки */}
      <div className="sticky z-10 flex gap-2 bg-[var(--tg-bg)] px-4 py-3" style={{ top: "var(--app-safe-top)" }}>
        {SUBTABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              haptic("light");
              setMode(t.key);
            }}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: mode === t.key ? "var(--tg-accent)" : "var(--tg-card)",
              color: mode === t.key ? "#fff" : "var(--tg-text)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="py-10 text-center text-[var(--tg-hint)]">Подбираю…</p>}

      {!loading && empty && (
        <p className="px-6 pb-4 text-center text-sm text-[var(--tg-hint)]">
          Вишлист пока пуст — показываю популярное. Добавляй фильмы, и рекомендации станут точнее.
        </p>
      )}

      {!loading && results.length === 0 && !empty && (
        <div className="px-6 py-16 text-center text-[var(--tg-hint)]">
          <p><Emoji e="🤔" size={40} /></p>
          <p className="mt-3">Пока нечего показать.</p>
        </div>
      )}

      {/* Сетка постеров */}
      <ul className="grid grid-cols-3 gap-2.5 px-4">
        {results.map((r) => {
          const k = keyOf(r);
          const isAdded = added.has(k);
          return (
            <li key={k} className="flex flex-col">
              <div className="relative overflow-hidden rounded-xl">
                <button onClick={() => setDetailTitle(r)} className="block w-full" aria-label="Детали">
                  <Poster src={r.poster} alt={r.title} className="w-full" />
                </button>
                <button
                  onClick={() => add(r)}
                  disabled={isAdded || adding === k}
                  className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold shadow-md"
                  style={{
                    background: isAdded ? "rgba(0,0,0,0.6)" : "var(--tg-accent)",
                    color: "#fff",
                  }}
                  aria-label={isAdded ? "Добавлено" : "В вишлист"}
                >
                  {isAdded ? "✓" : adding === k ? "…" : "+"}
                </button>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-tight">{r.title}</p>
              {r.year && <p className="text-[10px] text-[var(--tg-hint)]">{r.year}</p>}
            </li>
          );
        })}
      </ul>

      <TitleDetailSheet open={detailTitle} onClose={() => setDetailTitle(null)} onChanged={() => load(mode)} />
    </div>
  );
}
