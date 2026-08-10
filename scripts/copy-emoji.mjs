// Copies only the Apple emoji PNGs actually used in the UI into public/emoji,
// so we serve them from our own domain. Copying just the used set keeps it fast
// and the image lean (vs. all ~3800 files).
//
// When you use a NEW emoji via <Emoji e="..."/>, add its glyph to USED below.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const USED = ["🎬", "✨", "📥", "👥", "👤", "🚧", "🍿", "🤔"];

const SRC = "node_modules/emoji-datasource-apple/img/apple/64";
const DST = "public/emoji";

// Same naming as the <Emoji> component: codepoints without FE0F, lowercase hex, '-' joined.
function toCode(emoji) {
  return [...emoji]
    .map((ch) => ch.codePointAt(0))
    .filter((cp) => cp !== 0xfe0f)
    .map((cp) => cp.toString(16))
    .join("-");
}

if (!existsSync(SRC)) {
  console.warn("[copy-emoji] emoji-datasource-apple not found, skipping (native emoji fallback)");
  process.exit(0);
}

mkdirSync(DST, { recursive: true });

let copied = 0;
const missing = [];
for (const glyph of USED) {
  const code = toCode(glyph);
  const from = `${SRC}/${code}.png`;
  const to = `${DST}/${code}.png`;
  if (existsSync(from)) {
    copyFileSync(from, to);
    copied += 1;
  } else {
    missing.push(`${glyph} (${code})`);
  }
}

console.log(`[copy-emoji] copied ${copied}/${USED.length} emoji to ${DST}`);
if (missing.length) console.warn(`[copy-emoji] not found in set: ${missing.join(", ")}`);
