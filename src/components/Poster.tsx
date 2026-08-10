"use client";

// Постер с плейсхолдером на случай отсутствия картинки.
export default function Poster({
  src,
  alt,
  className = "",
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--tg-card)] text-[var(--tg-hint)] ${className}`}
        style={{ aspectRatio: "2 / 3" }}
      >
        <span className="text-2xl">🎬</span>
      </div>
    );
  }
  // Обычный img (TMDB CDN), без next/image — проще для мини-аппа
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`object-cover ${className}`} style={{ aspectRatio: "2 / 3" }} />;
}
