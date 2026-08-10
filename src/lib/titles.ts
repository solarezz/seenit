import { prisma } from "./db";
import type { TmdbTitle } from "./tmdb";

/** Сохраняет (или обновляет) метаданные тайтла TMDB в локальном кэше и возвращает запись. */
export async function upsertTitle(t: TmdbTitle) {
  return prisma.title.upsert({
    where: { tmdbId_type: { tmdbId: t.tmdbId, type: t.type } },
    create: {
      tmdbId: t.tmdbId,
      type: t.type,
      title: t.title,
      year: t.year,
      poster: t.poster,
      overview: t.overview,
      genres: [], // имена жанров подтянем в Фазе 2; пока пусто
    },
    update: {
      title: t.title,
      year: t.year,
      poster: t.poster,
      overview: t.overview,
    },
  });
}
