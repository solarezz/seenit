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

export interface TitleDetail extends TitleBrief {
  overview: string | null;
  genres: string[];
  rating: number | null;
  runtime: number | null;
  seasons: number | null;
  cast: string[];
  trailerKey: string | null;
  inWishlist: boolean;
  inFavorites: boolean;
}

export interface PublicUser {
  id: string;
  username: string | null;
  name: string;
  avatarUrl: string | null;
}

export interface FriendEntry {
  id: string; // id связи (friendship)
  user: PublicUser;
}

export interface RecInboxItem {
  id: string;
  status: "new" | "added" | "dismissed";
  comment: string | null;
  createdAt: string;
  from: PublicUser;
  title: TitleBrief;
}

export interface FeedItem {
  id: string;
  type: string;
  label: string;
  meta: { stars?: number } | null;
  createdAt: string;
  user: PublicUser;
  title: TitleBrief;
}

export interface ProfileData {
  user: PublicUser;
  notifPrefs: Record<string, boolean>;
  stats: {
    wishlist: number;
    watched: number;
    favorites: number;
    friends: number;
    avgRating: number | null;
    ratedCount: number;
  };
}
