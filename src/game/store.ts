import { useCallback, useEffect, useState } from "react";
import { chestTierForLevel } from "./fishing";
import type { ChestTier } from "./data";

// DEV PREVIEW SAVE — stored on this device only. No currency, no earnings.
export interface Catch { fishId: string; bestKg: number; count: number }
export interface Save {
  level: number; xp: number; baits: Record<string, number>; catches: Record<string, Catch>;
  chests: ChestTier[]; worldId: string; previewAll: boolean; muted: boolean;
}

const KEY = "fishing-world-dev-save-v2";
const fresh = (): Save => ({ level: 1, xp: 0, baits: { worm: 12, berry: 3, premium: 1, golden: 0 }, catches: {}, chests: ["wood", "blue"], worldId: "green-lake", previewAll: false, muted: false });
export const xpForLevel = (lvl: number) => 100 * lvl;

export function useSave() {
  const [save, setSave] = useState<Save>(fresh);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setSave({ ...fresh(), ...JSON.parse(raw) }); } catch { /* ignore */ }
  }, []);
  const update = useCallback((fn: (s: Save) => Save) => {
    setSave((s) => { const n = fn(s); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  }, []);
  const reset = useCallback(() => update(() => fresh()), [update]);
  return { save, update, reset };
}

export function addXp(s: Save, xp: number): Save {
  let { level, xp: cur } = s; const chests = [...s.chests]; cur += xp;
  while (cur >= xpForLevel(level)) { cur -= xpForLevel(level); level++; chests.push(chestTierForLevel(level)); }
  return { ...s, level, xp: cur, chests };
}
