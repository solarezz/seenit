"use client";

// Рендерит эмодзи как Apple-картинку (одинаково на iOS/Android/Windows).
// Имя файла = кодпоинты через дефис (без вариационного селектора FE0F), lowercase hex.
// Если картинки нет — браузер покажет alt (нативный эмодзи), т.е. деградация мягкая.

function toCode(emoji: string): string {
  return [...emoji]
    .map((ch) => ch.codePointAt(0)!)
    .filter((cp) => cp !== 0xfe0f) // убираем variation selector
    .map((cp) => cp.toString(16))
    .join("-");
}

export default function Emoji({
  e,
  size = 20,
  className = "",
}: {
  e: string;
  size?: number;
  className?: string;
}) {
  const code = toCode(e);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/emoji/${code}.png`}
      alt={e}
      draggable={false}
      className={className}
      style={{
        width: size,
        height: size,
        display: "inline-block",
        verticalAlign: "-0.15em",
        objectFit: "contain",
      }}
    />
  );
}
