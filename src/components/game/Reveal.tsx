import { useEffect, useState } from "react";
import { art } from "@/game/art";
import { RARITY_LABEL, type FishDef, type Rarity } from "@/game/data";
import { sfx } from "@/game/sfx";
import { haptic } from "@/game/telegram";
import { Burst } from "./Hud";

export const RARITY_TEXT: Record<Rarity, string> = { common: "text-common", rare: "text-rare", epic: "text-epic", legendary: "text-legendary" };
export const RARITY_BORDER: Record<Rarity, string> = { common: "border-common", rare: "border-rare", epic: "border-epic", legendary: "border-legendary" };
export const RARITY_BG: Record<Rarity, string> = { common: "bg-common", rare: "bg-rare", epic: "bg-epic", legendary: "bg-legendary" };

export interface RevealData { fish: FishDef; kg: number; isNew: boolean; record: boolean }

export function Reveal({ r, onCollect }: { r: RevealData; onCollect: () => void }) {
  const [xp, setXp] = useState(0);
  const big = r.fish.rarity === "epic" || r.fish.rarity === "legendary";
  useEffect(() => {
    sfx.reveal(big); haptic.success();
    const start = performance.now();
    let raf = 0; const tick = () => { const k = Math.min((performance.now() - start - 500) / 700, 1); setXp(Math.max(0, Math.round(r.fish.xp * k))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [r, big]);
  return (
    <div className="no-select absolute inset-0 z-40 grid place-items-center overflow-hidden bg-background/75 p-5 backdrop-blur-sm">
      <div className="bg-rays animate-rays pointer-events-none absolute left-1/2 top-[42%] h-[170vmax] w-[170vmax]" />
      <div className="animate-flash pointer-events-none absolute inset-0 bg-foreground/60" />
      <div className="relative w-full max-w-sm">
        <div className="ribbon animate-pop relative z-10 mx-auto -mb-5 w-fit px-10 py-2 text-3xl">{r.isNew ? "سمكة جديدة!" : "تهانينا!"}</div>
        <div className={`panel animate-pop relative border-[3px] px-5 pb-5 pt-8 text-center ${RARITY_BORDER[r.fish.rarity]} glow-${r.fish.rarity}`} style={{ animationDelay: ".08s" }}>
          <Burst count={big ? 36 : 22} />
          <span className={`inline-block rounded-full px-4 py-0.5 font-display text-base text-background ${RARITY_BG[r.fish.rarity]}`}>{RARITY_LABEL[r.fish.rarity]}</span>
          <div className="relative mx-auto my-3 grid h-44 place-items-center">
            <div className={`absolute inset-6 rounded-full blur-2xl opacity-70 ${RARITY_BG[r.fish.rarity]}`} />
            <img src={art(r.fish.art)} alt={r.fish.name} className="animate-bob relative max-h-48 object-contain drop-shadow-2xl" />
          </div>
          <h2 className="font-display text-3xl text-stroke">{r.fish.name}</h2>
          <p className="mt-1 font-bold text-muted-foreground">{r.kg} كغ {r.record && <span className="text-primary">• رقم قياسي جديد!</span>}</p>
          <div className="mt-3 flex justify-center gap-2">
            <div className="animate-float-up rounded-full bg-muted px-5 py-1.5 font-display text-xl text-primary" style={{ animationDelay: ".45s" }}>+{xp} XP</div>
          </div>
          <button onClick={onCollect} className="btn-green mt-5 block w-full py-3 text-2xl">جمع المكافأة</button>
          <p className="mt-2 text-[10px] text-muted-foreground">نقاط خبرة للمعاينة فقط — لا قيمة مالية لها</p>
        </div>
      </div>
    </div>
  );
}
