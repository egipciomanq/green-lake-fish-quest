// Pure gameplay rules (no React / three.js).
import { BAITS, CHESTS, RARITY_WEIGHT, type ChestTier, type FishDef, type Rarity } from "./data";

export function rarityWeights(boost: number): Record<Rarity, number> {
  return {
    common: Math.max(8, RARITY_WEIGHT.common - boost * 15),
    rare: RARITY_WEIGHT.rare + boost * 6,
    epic: RARITY_WEIGHT.epic + boost * 5,
    legendary: RARITY_WEIGHT.legendary + boost * 3,
  };
}

export function pickFish(pool: FishDef[], boost: number, rng = Math.random): { fish: FishDef; kg: number } {
  const w = rarityWeights(boost);
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = rng() * total;
  let rarity: Rarity = "common";
  for (const k of Object.keys(w) as Rarity[]) { r -= w[k]; if (r <= 0) { rarity = k; break; } }
  const options = pool.filter((f) => f.rarity === rarity);
  const list = options.length ? options : pool;
  const fish = list[Math.floor(rng() * list.length)] ?? pool[0]!;
  const kg = Math.round((fish.minKg + rng() * (fish.maxKg - fish.minKg)) * 10) / 10;
  return { fish, kg };
}

/** A strong cast (power ≥ PERFECT_CAST) counts as +1 bait boost. */
export const PERFECT_CAST = 0.85;
export const castBoost = (power: number) => (power >= PERFECT_CAST ? 1 : 0);

/** Chest → bait bundles (dev preview rewards only). Higher tiers favour better bait. */
export function rollChest(tier: ChestTier, rng = Math.random): { baitId: string; qty: number }[] {
  const tierBonus = { wood: 0, blue: 0.15, gold: 0.3, epic: 0.45 }[tier];
  return Array.from({ length: CHESTS[tier].rolls }, () => {
    const r = rng() + tierBonus;
    const bait = r < 0.6 ? BAITS[0]! : r < 0.9 ? BAITS[1]! : r < 1.15 ? BAITS[2]! : BAITS[3]!;
    return { baitId: bait.id, qty: [6, 3, 2, 1][bait.boost] ?? 1 };
  });
}

export const chestTierForLevel = (level: number): ChestTier =>
  level >= 20 ? "epic" : level >= 10 ? "gold" : level >= 4 ? "blue" : "wood";

// ---- Reeling: hold to reel, release to ease off. Keep tension under the snap line. ----
export const BITE_WINDOW = 1.4;
export const REEL = { GAIN: 0.3, DECAY: 0.05, TENSION_UP: 0.55, TENSION_DOWN: 0.7, SURGE: 0.9, SAFE: 0.85 };

export interface ReelState { progress: number; tension: number; surge: number; t: number }
export const newReel = (): ReelState => ({ progress: 0.15, tension: 0.2, surge: 0, t: 0 });
export type ReelResult = "reeling" | "landed" | "snapped" | "escaped";

export function stepReel(s: ReelState, holding: boolean, dt: number, power: number, rng = Math.random): { state: ReelState; result: ReelResult } {
  let { progress, tension, surge, t } = s;
  t += dt;
  // fish surges randomly; stronger fish surge harder and more often
  if (surge <= 0 && rng() < dt * 0.6 * power) surge = 0.6 + rng() * 0.6;
  const surging = surge > 0;
  surge = Math.max(0, surge - dt);
  if (holding) {
    tension += (REEL.TENSION_UP + (surging ? REEL.SURGE * power : 0)) * dt;
    progress += (REEL.GAIN / power) * dt * (surging ? 0.3 : 1);
  } else {
    tension -= REEL.TENSION_DOWN * dt;
    progress -= (REEL.DECAY + (surging ? 0.12 * power : 0)) * dt;
  }
  tension = Math.max(0, Math.min(1, tension));
  progress = Math.min(1, progress);
  const state = { progress, tension, surge, t };
  if (progress >= 1) return { state, result: "landed" };
  if (tension >= 1) return { state, result: "snapped" };
  if (progress <= 0) return { state, result: "escaped" };
  return { state, result: "reeling" };
}
