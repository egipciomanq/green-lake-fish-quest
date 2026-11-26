import { useState } from "react";
import { art } from "@/game/art";
import { BAITS, CHESTS, type ChestTier } from "@/game/data";
import { claimAdReward, openChest } from "@/lib/game.functions";
import { showRewardedAd } from "@/game/ads";
import type { Rules } from "@/game/account";
import { PlayCircle } from "lucide-react";
import type { Player } from "@/lib/game.server";
import type { Save } from "@/game/store";
import { sfx } from "@/game/sfx";
import { haptic } from "@/game/telegram";
import { Burst } from "./Hud";

type Loot = { baitId: string; qty: number }[];
const TAPS = 3;

export function BagScreen({ save, onPlayer, rules, adsToday }: { save: Save; onPlayer: (p: Player) => void; rules: Rules; adsToday: number }) {
  const [opening, setOpening] = useState<{ tier: ChestTier; index: number } | null>(null);
  const [adMsg, setAdMsg] = useState<{ t: string; ok?: boolean } | null>(null);
  const [adBusy, setAdBusy] = useState(false);
  const watchAd = async () => {
    setAdBusy(true); setAdMsg(null);
    try {
      const done = await showRewardedAd(rules.adsgramBlockId);
      if (!done) { setAdMsg({ t: "Watch the full ad to claim your reward" }); }
      else { const r = await claimAdReward(); onPlayer(r.player); sfx.xp(); haptic.success(); setAdMsg({ t: `+${r.baits} Basic Bait${r.coins ? ` and +${r.coins} coins` : ""}`, ok: true }); }
    } catch (e) { setAdMsg({ t: e instanceof Error ? e.message : "Error" }); }
    setAdBusy(false);
  };
  return (
    <div className="pt-safe h-full overflow-y-auto px-4 pb-32" dir="ltr" lang="en">
      <div className="mb-3 text-center"><div className="ribbon mx-auto w-fit px-10 py-1.5 text-2xl">Bag</div>
        <p className="mt-2 text-xs text-muted-foreground">Open chests to get better bait and rarer fish.</p></div>

      <h2 className="mb-2 font-display text-xl text-stroke">Chests ({save.chests.length})</h2>
      {save.chests.length === 0 ? (
        <div className="panel-glass p-4 text-center text-sm text-muted-foreground">No chests yet. Level up to earn a new chest!</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {save.chests.map((tier, i) => (
            <button key={i} onClick={() => { sfx.tap(); setOpening({ tier, index: i }); }} className={`panel animate-float-up relative p-2 glow-${CHESTS[tier].glow}`} style={{ animationDelay: `${i * 60}ms` }}>
              <img src={art(CHESTS[tier].art)} alt={CHESTS[tier].name} className="animate-bob mx-auto h-16 object-contain" style={{ animationDelay: `${i * 300}ms` }} />
              <div className="mt-1 text-[11px] font-bold">{CHESTS[tier].name}</div>
            </button>
          ))}
        </div>
      )}

      {rules.adsgramBlockId && (
        <div className="panel mt-4 p-3">
          <div className="flex items-center gap-3">
            <PlayCircle className="h-10 w-10 shrink-0 text-primary" />
            <div className="flex-1"><div className="font-bold">Free Bait</div><div className="text-xs text-muted-foreground">Watch a quick optional ad to get {rules.adRewardBaits} bait{rules.adRewardCoins ? ` and ${rules.adRewardCoins} coins` : ""} • {adsToday}/{rules.adDailyLimit} today</div></div>
          </div>
          <button disabled={adBusy || adsToday >= rules.adDailyLimit} onClick={watchAd} className="btn-gold mt-2 w-full py-2 text-lg disabled:opacity-50">{adsToday >= rules.adDailyLimit ? "Come back tomorrow" : adBusy ? "..." : "Watch Ad"}</button>
          {adMsg && <div className={`mt-2 text-center text-sm font-bold ${adMsg.ok ? "text-primary" : "text-destructive"}`}>{adMsg.t}</div>}
          <div className="mt-1 text-center text-[10px] text-muted-foreground">Ad</div>
        </div>
      )}

      <h2 className="mb-2 mt-6 font-display text-xl text-stroke">Bait</h2>
      <div className="space-y-2">
        {BAITS.map((b) => (
          <div key={b.id} className="panel flex items-center gap-3 p-2.5">
            <img src={art(b.art)} alt={b.name} className="h-12 w-12 object-contain drop-shadow-md" />
            <div className="flex-1"><div className="font-bold">{b.name}</div><div className="text-xs text-muted-foreground">{b.desc}</div></div>
            <div className="font-display text-2xl text-primary">×{save.baits[b.id] ?? 0}</div>
          </div>
        ))}
      </div>

      {opening && <ChestOpening tier={opening.tier} index={opening.index} onDone={(p) => { onPlayer(p); setOpening(null); }} onCancel={() => setOpening(null)} />}
    </div>
  );
}

function ChestOpening({ tier, index, onDone, onCancel }: { tier: ChestTier; index: number; onDone: (p: Player) => void; onCancel: () => void }) {
  const [taps, setTaps] = useState(0);
  const [loot, setLoot] = useState<Loot | null>(null);
  const [player, setPl] = useState<Player | null>(null);
  const [err, setErr] = useState("");
  const c = CHESTS[tier];
  const tap = () => {
    if (loot) return;
    const n = taps + 1; setTaps(n);
    if (n < TAPS) { sfx.shake(); haptic.light(); return; }
    openChest({ data: { index } }).then((r) => {
      sfx.chestOpen(); haptic.heavy(); setPl(r.player); setLoot(r.loot);
      r.loot.forEach((_, i) => window.setTimeout(() => sfx.card(), 450 + i * 220));
    }).catch((e: Error) => { setErr(e.message); setTaps(0); });
  };
  const intensity = taps / TAPS;
  return (
    <div className="no-select fixed inset-0 z-50 grid place-items-center overflow-hidden bg-background/90 p-6 backdrop-blur-md" dir="ltr" lang="en">
      <div className="bg-rays animate-rays pointer-events-none absolute left-1/2 top-[40%] h-[170vmax] w-[170vmax]" style={{ opacity: loot ? 1 : 0.3 + intensity * 0.5 }} />
      {loot && <div className="animate-flash pointer-events-none absolute inset-0 bg-primary/70" />}
      <div className="relative w-full max-w-sm text-center">
        <div className="ribbon mx-auto mb-6 w-fit px-8 py-1.5 text-2xl">{c.name}</div>
        {!loot ? (
          <>
            <button onClick={tap} className="relative mx-auto block">
              <div className={`absolute inset-0 rounded-full blur-3xl bg-${c.glow}`} style={{ opacity: 0.3 + intensity * 0.6, transform: `scale(${1 + intensity * 0.4})` }} />
              <img key={taps} src={art(c.art)} alt={c.name} className={`relative h-52 object-contain drop-shadow-2xl ${taps > 0 ? "animate-shake" : "animate-bob"}`} style={{ transform: `scale(${1 + intensity * 0.15})` }} />
            </button>
            <p className="mt-6 font-display text-2xl text-stroke">{taps === 0 ? "Tap the chest to open!" : `Tap ${TAPS - taps} more time${TAPS - taps === 1 ? "" : "s"}!`}</p>
            <div className="mt-3 flex justify-center gap-2">{Array.from({ length: TAPS }, (_, i) => <span key={i} className={`h-3 w-3 rounded-full ${i < taps ? "bg-primary" : "bg-muted"}`} />)}</div>
            {err && <p className="mt-3 text-sm font-bold text-destructive">{err}</p>}
            <button onClick={onCancel} className="mt-6 text-sm text-muted-foreground underline">Later</button>
          </>
        ) : (
          <>
            <div className="relative h-24"><Burst count={40} /><img src={art(c.art)} alt="" className="animate-pop mx-auto h-24 object-contain opacity-90" /></div>
            <div className={`mt-4 grid gap-2 ${loot.length > 3 ? "grid-cols-2" : "grid-cols-3"}`} style={{ perspective: 600 }}>
              {loot.map((x, i) => { const b = BAITS.find((y) => y.id === x.baitId)!; const glow = ["common", "rare", "epic", "legendary"][b.boost]; return (
                <div key={i} className={`panel animate-flip-in p-2 glow-${glow}`} style={{ animationDelay: `${450 + i * 220}ms` }}>
                  <img src={art(b.art)} alt={b.name} className="mx-auto h-14 w-14 object-contain drop-shadow-lg" />
                  <div className="mt-1 text-[11px] font-bold">{b.name}</div><div className="font-display text-xl text-primary">×{x.qty}</div>
                </div>); })}
            </div>
            <button onClick={() => { sfx.xp(); if (player) onDone(player); }} className="btn-green animate-float-up mt-6 w-full py-3 text-2xl" style={{ animationDelay: `${600 + loot.length * 220}ms` }}>Claim</button>
          </>
        )}
      </div>
    </div>
  );
}
