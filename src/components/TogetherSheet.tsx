"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { PublicUser, TitleBrief } from "@/lib/types";
import Poster from "./Poster";

export default function TogetherSheet({
  friend,
  onClose,
  onOpenTitle,
}: {
  friend: PublicUser | null;
  onClose: () => void;
  onOpenTitle: (t: TitleBrief) => void;
}) {
  const [items, setItems] = useState<TitleBrief[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!friend) return;
    setLoading(true);
    api<{ items: TitleBrief[] }>(`/api/together?friendId=${friend.id}`)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [friend]);

  if (!friend) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="max-h-[80vh] overflow-y-auto rounded-t-3xl bg-[var(--tg-bg)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--tg-hint)]" />
        <p className="mb-1 text-center font-medium">Посмотреть вместе</p>
        <p className="mb-3 text-center text-sm text-[var(--tg-hint)]">
          В вишлистах у тебя и у {friend.name}
        </p>

        {loading ? (
          <p className="py-10 text-center text-[var(--tg-hint)]">Ищу совпадения…</p>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--tg-hint)]">
            Общих фильмов пока нет. Добавляйте больше в вишлисты — и они появятся здесь.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2.5 pb-2">
            {items.map((t) => (
              <li key={`${t.type}:${t.tmdbId}`}>
                <button onClick={() => onOpenTitle(t)} className="block w-full overflow-hidden rounded-xl">
                  <Poster src={t.poster} alt={t.title} className="w-full" />
                </button>
                <p className="mt-1 line-clamp-2 text-xs leading-tight">{t.title}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
