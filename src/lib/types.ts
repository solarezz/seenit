export type TitleType = "movie" | "tv";
export type WishStatus = "want" | "watching" | "watched";

export interface TitleBrief {
  tmdbId: number;
  type: TitleType;
  title: string;
  year: number | null;
  poster: string | null;
}

export interface WishlistItem {
  id: string;
  status: WishStatus;
  stars: number | null;
  addedAt?: string;
  title: TitleBrief;
}

export interface SearchResult extends TitleBrief {
  overview: string | null;
}
