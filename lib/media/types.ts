export type MediaItem = {
  id: string | number;
  type: "image" | "video";
  url: string;
  name?: string;
  gameId?: string | number | null;
  gameName?: string;
  time?: string;
  thumbnail?: string | null;
};

export type MediaFilters = {
  search: string;
  gameId: string;
  type: string;
  sort: "newest" | "oldest";
};
