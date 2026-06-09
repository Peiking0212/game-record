/** Legacy-compatible name aliases for cloud games matching */
export type WishlistAlias = { name: string; steamAppId?: number };

export const WISHLIST_GAME_ALIASES: Record<string, WishlistAlias> = {
  星露谷物语: { name: "stardew valley", steamAppId: 413150 },
  星露谷: { name: "stardew valley", steamAppId: 413150 },
  "stardew valley": { name: "stardew valley", steamAppId: 413150 },
  "dota 2": { name: "dota 2", steamAppId: 570 },
  dota2: { name: "dota 2", steamAppId: 570 },
  反恐精英2: { name: "counter-strike 2", steamAppId: 730 },
  cs2: { name: "counter-strike 2", steamAppId: 730 },
  "counter-strike 2": { name: "counter-strike 2", steamAppId: 730 },
};

export function normalizeWishlistGameName(name: string): string {
  return String(name || "").trim().toLowerCase();
}

export function getWishlistAlias(name: string): WishlistAlias | null {
  const key = normalizeWishlistGameName(name);
  return WISHLIST_GAME_ALIASES[key] ?? null;
}