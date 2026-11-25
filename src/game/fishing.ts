// Pure gameplay rules (no React / three.js).
import { BAITS, GREEN_LAKE_FISH, RARITY_WEIGHT, type FishDef, type Rarity } from "./data";

export function rarityWeights(boost: number): Record<Rarity, number> {
  return {
    common: Math.max(10, RARITY_WEIGHT.common - boost * 18),
    rare: RARITY_WEIGHT.rare + boost * 8,
    epic: RARITY_WEIGHT.epic + boost * 6,
    legendary: RARITY_WEIGHT.legendary + boost * 4,
  };
}

export function pickFish(boost: number, rng = Math.random): { fish: FishDef; kg: number } {
  const w = rarityWeights(boost);
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = rng() * total;
  let rarity: Rarity = "common";
  for (const k of Object.keys(w) as Rarity[]) { r -= w[k]; if (r <= 0) { rarity = k; break; } }
  const pool = GREEN_LAKE_FISH.filter((f) => f.rarity === rarity);
  const fish = pool[Math.floor(rng() * pool.length)] ?? GREEN_LAKE_FISH[0]!;
  const kg = Math.round((fish.minKg + rng() * (fish.maxKg - fish.minKg)) * 10) / 10;
  return { fish, kg };
}

/** Chest → 3 bait bundles (dev preview rewards). */
export function rollChest(rng = Math.random): { baitId: string; qty: number }[] {
  return [0, 1, 2].map(() => {
    const r = rng();
    const bait = r < 0.6 ? BAITS[0]! : r < 0.92 ? BAITS[1]! : BAITS[2]!;
    return { baitId: bait.id, qty: bait.boost === 0 ? 5 : bait.boost === 1 ? 3 : 1 };
  });
}

export const BITE_WINDOW = 1.6; // seconds to tap after bite
export const REEL_TAPS = 8; // taps needed to land the fish
