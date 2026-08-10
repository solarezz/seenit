"use client";

import { useEffect, useState } from "react";
import { api, haptic } from "@/lib/client";
import type { FriendEntry, TitleBrief } from "@/lib/types";

export default function RecommendSheet({
  title,
  onClose,
}: {
  title: TitleBrief | null;
  onClose: () => void;
}) {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!title) return;
    setPick(null);
    setComment("");
    setSent(false);
    api<{ friends: FriendEntry[] }>("/api/friends")
      .then((d) => setFriends(d.friends))
      .catch(() => setFriends([]));
  }, [title]);

  if (!title) return null;

  async function send() {
    if (!pick || !title) return;
    setSending(true);
    haptic("medium");
    try {
      await api("/api/recs", {
        method: "POST",
        body: JSON.stringify({ toUserId: pick, tmdbId: title.tmdbId, type: title.type, comment }),
      });
      setSent(true);
      setTimeout(onClose, 900);
    } catch {
      // no-op
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="max-h-[80vh] overflow-y-auto rounded-t-3xl bg-[var(--tg-bg)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--tg-hint)]" />
        <p className="mb-1 text-center font-medium">Порекомендовать другу</p>
        <p className="mb-3 text-center text-sm text-[var(--tg-hint)]">
          «{title.title}»{title.year ? ` (${title.year})` : ""}
        </p>

        {sent ? (
          <p className="py-8 text-center text-[var(--tg-accent)]">Отправлено ✅</p>
        ) : friends.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--tg-hint)]">
            Пока нет друзей. Добавь друга во вкладке «Друзья».
          </p>
        ) : (
          <>
            <ul className="mb-3 space-y-1.5">
              {friends.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => {
                      haptic("light");
                      setPick(f.user.id);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left"
                    style={{
                      background: pick === f.user.id ? "var(--tg-accent)" : "var(--tg-card)",
                      color: pick === f.user.id ? "#fff" : "var(--tg-text)",
                    }}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-sm">
                      {f.user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{f.user.name}</span>
                    {pick === f.user.id && <span className="ml-auto">✓</span>}
                  </button>
                </li>
              ))}
            </ul>

            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Комментарий (необязательно)"
              maxLength={200}
              className="mb-3 w-full rounded-xl bg-[var(--tg-card)] px-4 py-2.5 text-base outline-none placeholder:text-[var(--tg-hint)]"
            />

            <button
              onClick={send}
              disabled={!pick || sending}
              className="w-full rounded-xl py-3 font-medium disabled:opacity-50"
              style={{ background: "var(--tg-accent)", color: "#fff" }}
            >
              {sending ? "Отправляю…" : "Отправить"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
