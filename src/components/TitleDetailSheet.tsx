"use client";

import { useEffect, useState } from "react";
import { api, haptic, openExternal } from "@/lib/client";
import type { TitleBrief, TitleDetail } from "@/lib/types";
import Poster from "./Poster";

function runtimeText(mins: number | null): string | null {
  if (!mins) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

export default function TitleDetailSheet({
  open,
  onClose,
  onChanged,
}: {
  open: TitleBrief | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<TitleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) {
      setData(null);
      return;
    }
    setLoading(true);
    api<TitleDetail>(`/api/title/${open.type}/${open.tmdbId}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  async function addToWishlist() {
    if (!data) return;
    setAdding(true);
    haptic("medium");
    try {
      await api("/api/wishlist", {
        method: "POST",
        body: JSON.stringify({ tmdbId: data.tmdbId, type: data.type }),
      });
      setData({ ...data, inWishlist: true });
      onChanged?.();
    } catch {
      /* ignore */
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="max-h-[88vh] overflow-y-auto rounded-t-3xl bg-[var(--tg-bg)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--tg-hint)]" />

        {loading || !data ? (
          <p className="py-16 text-center text-[var(--tg-hint)]">Загружаю…</p>
        ) : (
          <>
            <div className="flex gap-3">
              <Poster src={data.poster} alt={data.title} className="w-28 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold leading-tight">{data.title}</h2>
                <p className="mt-0.5 text-sm text-[var(--tg-hint)]">
                  {data.type === "tv" ? "Сериал" : "Фильм"}
                  {data.year ? ` · ${data.year}` : ""}
                  {data.seasons ? ` · ${data.seasons} сезон(ов)` : ""}
                  {runtimeText(data.runtime) ? ` · ${runtimeText(data.runtime)}` : ""}
                </p>
                {data.rating != null && (
                  <p className="mt-1 text-sm">
                    <span style={{ color: "#f5c518" }}>★</span> {data.rating}{" "}
                    <span className="text-[var(--tg-hint)]">TMDB</span>
                  </p>
                )}
                {data.genres.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.genres.map((g) => (
                      <span key={g} className="rounded-full bg-[var(--tg-card)] px-2.5 py-0.5 text-xs">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Действия */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={addToWishlist}
                disabled={data.inWishlist || adding}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium disabled:opacity-60"
                style={{
                  background: data.inWishlist ? "var(--tg-card)" : "var(--tg-accent)",
                  color: data.inWishlist ? "var(--tg-hint)" : "#fff",
                }}
              >
                {data.inWishlist ? "✓ В вишлисте" : adding ? "…" : "+ В вишлист"}
              </button>
              {data.trailerKey && (
                <button
                  onClick={() => openExternal(`https://www.youtube.com/watch?v=${data.trailerKey}`)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium"
                  style={{ background: "var(--tg-card)" }}
                >
                  ▶ Трейлер
                </button>
              )}
            </div>

            {data.overview && <p className="mt-3 text-sm leading-relaxed">{data.overview}</p>}

            {data.cast.length > 0 && (
              <p className="mt-3 text-sm text-[var(--tg-hint)]">
                <span className="text-[var(--tg-text)]">В ролях:</span> {data.cast.join(", ")}
              </p>
            )}

            <button onClick={onClose} className="mt-4 w-full py-2 text-sm text-[var(--tg-hint)]">
              Закрыть
            </button>
          </>
        )}
      </div>
    </div>
  );
}
