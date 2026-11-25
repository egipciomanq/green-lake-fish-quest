import { useState } from "react";
import { art } from "@/game/art";
import { BAITS, CHESTS, type ChestTier } from "@/game/data";
import { rollChest } from "@/game/fishing";
import type { Save } from "@/game/store";
import { sfx } from "@/game/sfx";
import { haptic } from "@/game/telegram";
import { Burst, DevBadge } from "./Hud";

type Loot = { baitId: string; qty: number }[];
const TAPS = 3;

export function BagScreen({ save, update, onReset }: { save: Save; update: (fn: (s: Save) => Save) => void; onReset: () => void }) {
  const [opening, setOpening] = useState<{ tier: ChestTier; index: number } | null>(null);
  return (
    <div className="pt-safe h-full overflow-y-auto px-4 pb-32">
      <div className="mb-3 text-center"><div className="ribbon mx-auto w-fit px-10 py-1.5 text-2xl">الحقيبة</div>
        <p className="mt-2 text-xs text-muted-foreground">صناديق وطُعم للمعاينة فقط — ليست رصيداً ولا أرباحاً حقيقية.</p></div>

      <h2 className="mb-2 font-display text-xl text-stroke">الصناديق ({save.chests.length})</h2>
      {save.chests.length === 0 ? (
        <div className="panel-glass p-4 text-center text-sm text-muted-foreground">لا توجد صناديق. ارفع مستواك للحصول على صندوق جديد.</div>
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
      <button onClick={() => update((s) => ({ ...s, chests: [...s.chests, (["wood", "blue", "gold", "epic"] as ChestTier[])[Math.floor(Math.random() * 4)]!] }))}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent/60 py-2 text-xs font-bold text-accent">
        <DevBadge /> إضافة صندوق تجريبي
      </button>

      <h2 className="mb-2 mt-6 font-display text-xl text-stroke">الطُعم</h2>
      <div className="space-y-2">
        {BAITS.map((b) => (
          <div key={b.id} className="panel flex items-center gap-3 p-2.5">
            <img src={art(b.art)} alt={b.name} className="h-12 w-12 rounded-xl object-cover" />
            <div className="flex-1"><div className="font-bold">{b.name}</div><div className="text-xs text-muted-foreground">{b.desc}</div></div>
            <div className="font-display text-2xl text-primary">×{save.baits[b.id] ?? 0}</div>
          </div>
        ))}
      </div>
      <button onClick={onReset} className="mt-6 w-full rounded-xl border border-border/50 py-2 text-xs text-muted-foreground">إعادة ضبط بيانات التطوير</button>

      {opening && <ChestOpening tier={opening.tier} onDone={(loot) => {
        update((s) => { const baits = { ...s.baits }; loot.forEach((x) => { baits[x.baitId] = (baits[x.baitId] ?? 0) + x.qty; }); const chests = [...s.chests]; chests.splice(opening.index, 1); return { ...s, baits, chests }; });
        setOpening(null);
      }} onCancel={() => setOpening(null)} />}
    </div>
  );
}

function ChestOpening({ tier, onDone, onCancel }: { tier: ChestTier; onDone: (l: Loot) => void; onCancel: () => void }) {
  const [taps, setTaps] = useState(0);
  const [loot, setLoot] = useState<Loot | null>(null);
  const c = CHESTS[tier];
  const tap = () => {
    if (loot) return;
    const n = taps + 1; setTaps(n);
    if (n < TAPS) { sfx.shake(); haptic.light(); return; }
    sfx.chestOpen(); haptic.heavy();
    const l = rollChest(tier); setLoot(l);
    l.forEach((_, i) => window.setTimeout(() => sfx.card(), 450 + i * 220));
  };
  const intensity = taps / TAPS;
  return (
    <div className="no-select fixed inset-0 z-50 grid place-items-center overflow-hidden bg-background/90 p-6 backdrop-blur-md">
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
            <p className="mt-6 font-display text-2xl text-stroke">{taps === 0 ? "اضغط على الصندوق لفتحه" : `اضغط ${TAPS - taps} مرة أخرى!`}</p>
            <div className="mt-3 flex justify-center gap-2">{Array.from({ length: TAPS }, (_, i) => <span key={i} className={`h-3 w-3 rounded-full ${i < taps ? "bg-primary" : "bg-muted"}`} />)}</div>
            <button onClick={onCancel} className="mt-6 text-sm text-muted-foreground underline">لاحقاً</button>
          </>
        ) : (
          <>
            <div className="relative h-24"><Burst count={40} /><img src={art(c.art)} alt="" className="animate-pop mx-auto h-24 object-contain opacity-90" /></div>
            <div className={`mt-4 grid gap-2 ${loot.length > 3 ? "grid-cols-2" : "grid-cols-3"}`} style={{ perspective: 600 }}>
              {loot.map((x, i) => { const b = BAITS.find((y) => y.id === x.baitId)!; const glow = ["common", "rare", "epic", "legendary"][b.boost]; return (
                <div key={i} className={`panel animate-flip-in p-2 glow-${glow}`} style={{ animationDelay: `${450 + i * 220}ms` }}>
                  <img src={art(b.art)} alt={b.name} className="mx-auto h-14 w-14 rounded-xl object-cover" />
                  <div className="mt-1 text-[11px] font-bold">{b.name}</div><div className="font-display text-xl text-primary">×{x.qty}</div>
                </div>); })}
            </div>
            <button onClick={() => { sfx.xp(); onDone(loot); }} className="btn-green animate-float-up mt-6 w-full py-3 text-2xl" style={{ animationDelay: `${600 + loot.length * 220}ms` }}>جمع</button>
          </>
        )}
      </div>
    </div>
  );
}
