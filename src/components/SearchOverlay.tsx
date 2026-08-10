"use client";

import { useEffect, useRef, useState } from "react";
import { api, haptic } from "@/lib/client";
import type { SearchResult } from "@/lib/types";
import Poster from "./Poster";

export default function SearchOverlay({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    if (!open) {
      setQ("");
      setResults([]);
      setAdded(new Set());
    }
  }, [open]);

  // Дебаунс поиска
  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await api<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`);
        setResults(data.results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  async function add(r: SearchResult) {
    setAdding(r.tmdbId);
    haptic("medium");
    try {
      await api("/api/wishlist", {
        method: "POST",
        body: JSON.stringify({ tmdbId: r.tmdbId, type: r.type }),
      });
      setAdded((s) => new Set(s).add(r.tmdbId));
      onAdded();
    } catch {
      // no-op
    } finally {
      setAdding(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--tg-bg)]">
      <div className="flex items-center gap-2 border-b border-[var(--tg-border)] p-3">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Название фильма или сериала…"
          className="flex-1 rounded-xl bg-[var(--tg-card)] px-4 py-2.5 text-base outline-none placeholder:text-[var(--tg-hint)]"
        />
        <button onClick={onClose} className="px-2 py-1 text-[var(--tg-accent)]">
          Готово
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && <p className="py-6 text-center text-[var(--tg-hint)]">Ищу…</p>}
        {!loading && q && results.length === 0 && (
          <p className="py-6 text-center text-[var(--tg-hint)]">Ничего не нашёл</p>
        )}
        <ul className="space-y-2">
          {results.map((r) => {
            const isAdded = added.has(r.tmdbId);
            return (
              <li key={`${r.type}-${r.tmdbId}`} className="flex gap-3 rounded-2xl bg-[var(--tg-card)] p-2.5">
                <Poster src={r.poster} alt={r.title} className="w-14 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-sm text-[var(--tg-hint)]">
                    {r.type === "tv" ? "Сериал" : "Фильм"}
                    {r.year ? ` · ${r.year}` : ""}
                  </p>
                  {r.overview && <p className="mt-1 line-clamp-2 text-xs text-[var(--tg-hint)]">{r.overview}</p>}
                </div>
                <button
                  onClick={() => add(r)}
                  disabled={isAdded || adding === r.tmdbId}
                  className="self-center rounded-xl px-3 py-2 text-sm font-medium"
                  style={{
                    background: isAdded ? "transparent" : "var(--tg-accent)",
                    color: isAdded ? "var(--tg-hint)" : "#fff",
                  }}
                >
                  {isAdded ? "✓ В списке" : adding === r.tmdbId ? "…" : "+ В вишлист"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
