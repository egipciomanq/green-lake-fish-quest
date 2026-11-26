import type { ChestTier } from "./data";
export { xpForLevel } from "./fishing";

// Client view of the player's account. The server (src/lib/game.functions.ts) is the source of truth.
export interface Catch { fishId: string; bestKg: number; count: number }
export interface Save {
  level: number; xp: number; coins: number; baits: Record<string, number>; catches: Record<string, Catch>;
  chests: ChestTier[]; worldId: string; previewAll: boolean; muted: boolean;
}
