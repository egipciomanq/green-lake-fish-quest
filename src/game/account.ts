import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { telegramSignIn } from "@/lib/auth.functions";
import { getMe } from "@/lib/game.functions";
import type { Player } from "@/lib/game.server";
import type { Save } from "./store";

type Me = Awaited<ReturnType<typeof getMe>>;
export type Rules = Me["rules"];
type Status = "loading" | "ready" | "outside" | "error";

const MUTE_KEY = "fw-muted";
const initData = () => (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData ?? "";

export const toSave = (p: Player, muted: boolean): Save => ({
  level: p.level, xp: p.xp, coins: p.coins, baits: p.baits, catches: p.collection, chests: p.chests, worldId: p.worldId, previewAll: false, muted,
});

export function useAccount() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [save, setSave] = useState<Save | null>(null);

  const refresh = useCallback(async () => {
    const m = await getMe(); setMe(m);
    setSave((s) => toSave(m.player, s?.muted ?? localStorage.getItem(MUTE_KEY) === "1"));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = initData();
        if (data) {
          const { data: cur } = await supabase.auth.getUser();
          const tgId = new URLSearchParams(data).get("user");
          const wanted = tgId ? `tg${JSON.parse(tgId).id}@` : "";
          if (!cur.user || !cur.user.email?.startsWith(wanted)) {
            const ref = new URLSearchParams(window.location.search).get("ref") ?? "";
            const s = await telegramSignIn({ data: { initData: data, ...(/^[a-f0-9]{8}$/.test(ref) ? { ref } : {}) } });
            await supabase.auth.setSession(s);
          }
        } else {
          const { data: cur } = await supabase.auth.getUser();
          if (!cur.user) { setStatus("outside"); return; }
        }
        await refresh(); setStatus("ready");
      } catch (e) { setError(e instanceof Error ? e.message : "Unexpected error"); setStatus("error"); }
    })();
  }, [refresh]);

  const setPlayer = useCallback((p: Player) => setSave((s) => toSave(p, s?.muted ?? false)), []);
  const update = useCallback((fn: (s: Save) => Save) => setSave((s) => {
    if (!s) return s; const n = fn(s); if (n.muted !== s.muted) localStorage.setItem(MUTE_KEY, n.muted ? "1" : "0"); return n;
  }), []);

  return { status, error, save, me, rules: me?.rules ?? null, isAdmin: !!me?.isAdmin, player: me?.player ?? null, setPlayer, update, refresh };
}
