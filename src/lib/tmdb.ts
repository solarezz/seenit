// Тонкий клиент TMDB. Используем v4 read-access token (Bearer).
// Всё на русском: language=ru-RU, регион RU.

const BASE = "https://api.themoviedb.org/3";
export const TMDB_IMG = "https://image.tmdb.org/t/p";

export type TmdbType = "movie" | "tv";

export interface TmdbTitle {
  tmdbId: number;
  type: TmdbType;
  title: string;
  year: number | null;
  poster: string | null; // относительный путь, напр. /abc.jpg
  overview: string | null;
  genreIds: number[];
}

function token(): string {
  const t = process.env.TMDB_API_KEY;
  if (!t) throw new Error("TMDB_API_KEY не задан в .env");
  return t;
}

async function tmdb<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(BASE + path);
  url.searchParams.set("language", "ru-RU");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token()}`, accept: "application/json" },
    // Кэш метаданных на стороне Next для деталей/рекомендаций
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TMDB ${res.status} на ${path}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

function yearOf(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const y = Number(dateStr.slice(0, 4));
  return Number.isFinite(y) && y > 0 ? y : null;
}

interface RawItem {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  genre_ids?: number[];
  popularity?: number;
}

function normalize(raw: RawItem, forcedType?: TmdbType): TmdbTitle | null {
  const type: TmdbType | undefined =
    forcedType ?? (raw.media_type === "movie" || raw.media_type === "tv" ? raw.media_type : undefined);
  if (!type) return null; // отсекаем people и прочее
  return {
    tmdbId: raw.id,
    type,
    title: (type === "movie" ? raw.title : raw.name) ?? raw.title ?? raw.name ?? "Без названия",
    year: yearOf(type === "movie" ? raw.release_date : raw.first_air_date),
    poster: raw.poster_path ?? null,
    overview: raw.overview ?? null,
    genreIds: raw.genre_ids ?? [],
  };
}

/** Мультипоиск (фильмы + сериалы), отсортированный по релевантности/популярности. */
export async function searchTitles(query: string, limit = 3): Promise<TmdbTitle[]> {
  if (!query.trim()) return [];
  const data = await tmdb<{ results: RawItem[] }>("/search/multi", { query, page: 1, include_adult: "false" });
  return data.results
    .map((r) => normalize(r))
    .filter((x): x is TmdbTitle => x !== null)
    .slice(0, limit);
}

/** Детали одного тайтла (для карточки). */
export async function getTitle(tmdbId: number, type: TmdbType): Promise<TmdbTitle> {
  const raw = await tmdb<RawItem & { genres?: { id: number }[] }>(`/${type}/${tmdbId}`);
  const base = normalize(raw, type)!;
  base.genreIds = raw.genres?.map((g) => g.id) ?? base.genreIds;
  return base;
}

/** Рекомендации по конкретному тайтлу (для Фазы 2). */
export async function getRecommendations(tmdbId: number, type: TmdbType, limit = 10): Promise<TmdbTitle[]> {
  const data = await tmdb<{ results: RawItem[] }>(`/${type}/${tmdbId}/recommendations`);
  return data.results
    .map((r) => normalize(r, type))
    .filter((x): x is TmdbTitle => x !== null)
    .slice(0, limit);
}

/** Тренды недели (для вкладки «Новинки/популярное», Фаза 2). */
export async function getTrending(limit = 20): Promise<TmdbTitle[]> {
  const data = await tmdb<{ results: RawItem[] }>("/trending/all/week");
  return data.results
    .map((r) => normalize(r))
    .filter((x): x is TmdbTitle => x !== null)
    .slice(0, limit);
}

export function posterUrl(path: string | null, size: "w185" | "w342" | "w500" = "w342"): string | null {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}
