import { describe, expect, it } from "vitest";
import { WORLDS } from "./data";
import { castBoost, chestTierForLevel, newReel, pickFish, rarityWeights, rollChest, stepReel } from "./fishing";

const lake = WORLDS[0]!.fish;

describe("fishing rules", () => {
  it("there are ten worlds with five fish each", () => {
    expect(WORLDS).toHaveLength(10);
    WORLDS.forEach((w) => expect(w.fish).toHaveLength(5));
  });
  it("better bait raises legendary odds", () => {
    expect(rarityWeights(3).legendary).toBeGreaterThan(rarityWeights(0).legendary);
  });
  it("picks only fish from the current world, within weight range", () => {
    for (let i = 0; i < 200; i++) {
      const { fish, kg } = pickFish(lake, 1);
      expect(lake).toContain(fish);
      expect(kg).toBeGreaterThanOrEqual(fish.minKg);
      expect(kg).toBeLessThanOrEqual(fish.maxKg);
    }
  });
  it("perfect cast gives a bonus only at 85% power or more", () => {
    expect(castBoost(0.84)).toBe(0);
    expect(castBoost(0.85)).toBe(1);
  });
  it("chest tiers follow level", () => {
    expect(chestTierForLevel(1)).toBe("wood");
    expect(chestTierForLevel(4)).toBe("blue");
    expect(chestTierForLevel(10)).toBe("gold");
    expect(chestTierForLevel(20)).toBe("epic");
  });
  it("gold chest gives four bait bundles", () => {
    expect(rollChest("gold", () => 0.5)).toHaveLength(4);
  });
  it("holding forever snaps the line", () => {
    let s = newReel(); let r = "reeling";
    for (let i = 0; i < 200 && r === "reeling"; i++) ({ state: s, result: r } = stepReel(s, true, 0.05, 1.8, () => 0.01));
    expect(r).toBe("snapped");
  });
  it("never reeling lets the fish escape", () => {
    let s = newReel(); let r = "reeling";
    for (let i = 0; i < 400 && r === "reeling"; i++) ({ state: s, result: r } = stepReel(s, false, 0.05, 1, () => 0.99));
    expect(r).toBe("escaped");
  });
  it("pulsed reeling lands a common fish", () => {
    let s = newReel(); let r = "reeling";
    for (let i = 0; i < 2000 && r === "reeling"; i++) ({ state: s, result: r } = stepReel(s, s.tension < 0.6, 0.05, 0.8, () => 0.99));
    expect(r).toBe("landed");
  });
});

import { coinsForCatch, coinsToUsd, referralShare } from "./fishing";
describe("money rules", () => {
  const rules = { coins_common: 2, coins_rare: 5, coins_epic: 15, coins_legendary: 40, daily_coin_cap: 340, referral_percent: 10 };
  it("10000 points equal 1 USD, so the 1000 point minimum is 0.10 USD", () => {
    expect(coinsToUsd(10000, 10000)).toBe(1);
    expect(coinsToUsd(1000, 10000)).toBe(0.1);
  });
  it("referrer gets 10% of a friend's points", () => { expect(referralShare(40, 10)).toBe(4); });
  it("daily cap stops earning so 1000 points need at least 3 days", () => {
    expect(coinsForCatch("legendary", rules, 330)).toBe(10);
    expect(coinsForCatch("common", rules, 340)).toBe(0);
    expect(Math.ceil(1000 / rules.daily_coin_cap)).toBeGreaterThanOrEqual(3);
  });
});
