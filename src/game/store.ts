import { useCallback, useEffect, useState } from "react";

export interface Catch { fishId: string; bestKg: number; count: number }
export interface Save { level: number; xp: number; baits: Record<string, number>; catches: Record<string, Catch>; chests: number }

const KEY = "fishing-world-dev-save-v1";
const fresh = (): Save => ({ level: 1, xp: 0, baits: { worm: 10, shrimp: 2, golden: 0 }, catches: {}, chests: 1 });
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
  let { level, xp: cur, chests } = s; cur += xp;
  while (cur >= xpForLevel(level)) { cur -= xpForLevel(level); level++; chests++; }
  return { ...s, level, xp: cur, chests };
}
