"use client";

import { useCallback, useEffect, useState } from "react";
import { api, haptic } from "@/lib/client";
import type { RecInboxItem } from "@/lib/types";
import Poster from "./Poster";
import Emoji from "./Emoji";

export default function InboxTab() {
  const [items, setItems] = useState<RecInboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<{ items: RecInboxItem[] }>("/api/recs");
      setItems(d.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, status: "added" | "dismissed") {
    haptic("medium");
    setItems((prev) =>
      status === "dismissed"
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, status: "added" } : i)),
    );
    try {
      await api(`/api/recs/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch {
      load();
    }
  }

  return (
    <div className="pb-24">
      {loading && <p className="py-10 text-center text-[var(--tg-hint)]">Загружаю…</p>}

      {!loading && items.length === 0 && (
        <div className="px-6 py-16 text-center text-[var(--tg-hint)]">
          <p><Emoji e="📥" size={40} /></p>
          <p className="mt-3">Пока нет рекомендаций.</p>
          <p className="text-sm">Друзья смогут присылать сюда фильмы.</p>
        </div>
      )}

      <ul className="space-y-3 px-4 pt-3">
        {items.map((r) => (
          <li key={r.id} className="flex gap-3 rounded-2xl bg-[var(--tg-card)] p-3">
            <Poster src={r.title.poster} alt={r.title.title} className="w-16 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.title.title}</p>
              <p className="text-sm text-[var(--tg-hint)]">
                {r.title.type === "tv" ? "Сериал" : "Фильм"}
                {r.title.year ? ` · ${r.title.year}` : ""}
              </p>
              <p className="mt-1 text-xs text-[var(--tg-accent)]">от {r.from.name}</p>
              {r.comment && <p className="mt-1 text-sm">💬 {r.comment}</p>}

              <div className="mt-2 flex gap-2">
                {r.status === "added" ? (
                  <span className="rounded-lg px-3 py-1.5 text-xs text-[var(--tg-hint)]">✓ В вишлисте</span>
                ) : (
                  <>
                    <button
                      onClick={() => act(r.id, "added")}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium"
                      style={{ background: "var(--tg-accent)", color: "#fff" }}
                    >
                      + В вишлист
                    </button>
                    <button
                      onClick={() => act(r.id, "dismissed")}
                      className="rounded-lg px-3 py-1.5 text-xs text-[var(--tg-hint)]"
                      style={{ border: "1px solid var(--tg-border)" }}
                    >
                      Скрыть
                    </button>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
