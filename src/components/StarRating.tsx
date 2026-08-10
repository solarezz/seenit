"use client";

import { haptic } from "@/lib/client";

export default function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 22,
}: {
  value: number | null;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  return (
    <div className="flex gap-0.5" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (value ?? 0) >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => {
              if (readOnly) return;
              haptic("light");
              onChange?.(n);
            }}
            className={`leading-none transition-transform ${readOnly ? "" : "active:scale-90"}`}
            style={{ color: active ? "#f5c518" : "var(--tg-hint)" }}
            aria-label={`${n} звёзд`}
          >
            {active ? "★" : "☆"}
          </button>
        );
      })}
    </div>
  );
}
