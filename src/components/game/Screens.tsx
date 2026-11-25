import { useState } from "react";
import { Lock } from "lucide-react";
import { art } from "@/game/art";
import { RARITY_LABEL, WORLDS, type WorldDef } from "@/game/data";
import type { Save } from "@/game/store";
import { sfx } from "@/game/sfx";
import { DevBadge } from "./Hud";
import { RARITY_BORDER, RARITY_TEXT } from "./Reveal";

export const isUnlocked = (w: WorldDef, s: Save) => s.previewAll || s.level >= w.unlockLevel;

function Header({ title, sub }: { title: string; sub: string }) {
  return <div className="mb-4 text-center">
    <div className="ribbon mx-auto w-fit px-10 py-1.5 text-2xl">{title}</div>
    <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
  </div>;
}

export function WorldsScreen({ save, update, onPlay }: { save: Save; update: (fn: (s: Save) => Save) => void; onPlay: (id: string) => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="pt-safe h-full overflow-y-auto px-4 pb-32">
      <Header title="اختر العالم" sub="عشرة عوالم فريدة — لكل عالم بيئته وأسماكه" />
      <label className="panel-glass mb-4 flex items-center justify-between gap-3 p-3 text-sm font-bold">
        <span className="flex items-center gap-2"><DevBadge /> فتح كل العوالم للتجربة</span>
        <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent)]" checked={save.previewAll} onChange={(e) => update((s) => ({ ...s, previewAll: e.target.checked }))} />
      </label>
      {msg && <div className="panel animate-pop mb-3 p-2 text-center text-sm font-bold">{msg}</div>}
      <div className="grid grid-cols-2 gap-3">
        {WORLDS.map((w, i) => {
          const open = isUnlocked(w, save); const current = save.worldId === w.id;
          return (
            <button key={w.id} onClick={() => { sfx.tap(); if (open) onPlay(w.id); else { setMsg(`يُفتح عند المستوى ${w.unlockLevel}`); window.setTimeout(() => setMsg(null), 1500); } }}
              className={`animate-float-up relative overflow-hidden rounded-2xl border-[3px] text-start ${current ? "border-primary glow-legendary" : "border-border"}`} style={{ animationDelay: `${i * 45}ms` }}>
              <img src={art(`world-${w.num}`)} alt={w.name} loading="lazy" className={`aspect-[140/246] w-full object-cover ${open ? "" : "grayscale-[70%] brightness-50"}`} />
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-background/95 to-transparent p-2 pt-8">
                <div className="text-[11px] font-bold text-muted-foreground">{w.desc}</div>
                <div className="mt-1 flex -space-x-2 space-x-reverse">
                  {w.fish.slice(0, 5).map((f) => <img key={f.id} src={art(f.art)} alt="" className="h-7 w-7 rounded-full border border-border bg-muted object-contain p-0.5" />)}
                </div>
              </div>
              {!open && <div className="absolute inset-0 grid place-items-center"><div className="panel grid place-items-center px-3 py-2 text-center"><Lock className="h-6 w-6 text-primary" /><div className="text-xs font-bold">المستوى {w.unlockLevel}</div></div></div>}
              {open && <span className="btn-green absolute end-2 bottom-16 px-3 py-0.5 text-sm">{current ? "الحالي" : "العب"}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CollectionScreen({ save }: { save: Save }) {
  const [wid, setWid] = useState(save.worldId);
  const w = WORLDS.find((x) => x.id === wid) ?? WORLDS[0]!;
  const total = WORLDS.reduce((a, x) => a + x.fish.filter((f) => save.catches[f.id]).length, 0);
  return (
    <div className="pt-safe h-full overflow-y-auto px-4 pb-32">
      <Header title="مجموعة الأسماك" sub={`اصطدت ${total} من ${WORLDS.length * 5} نوعاً`} />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {WORLDS.map((x) => (
          <button key={x.id} onClick={() => { sfx.tap(); setWid(x.id); }} className={`shrink-0 rounded-full border-2 px-3 py-1 text-xs font-bold ${x.id === wid ? "btn-gold" : "border-border bg-muted"}`}>
            {x.num}. {x.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {w.fish.map((f, i) => {
          const c = save.catches[f.id];
          return (
            <div key={f.id} className={`panel animate-float-up border-[3px] p-2.5 text-center ${c ? RARITY_BORDER[f.rarity] : ""}`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="grid h-24 place-items-center overflow-hidden rounded-xl bg-muted"><img src={art(f.art)} alt={c ? f.name : "سمكة مجهولة"} className={`max-h-24 object-contain ${c ? "" : "silhouette"}`} /></div>
              <div className="mt-2 font-display text-base">{c ? f.name : "؟؟؟"}</div>
              <div className={`text-xs font-bold ${RARITY_TEXT[f.rarity]}`}>{RARITY_LABEL[f.rarity]}</div>
              {c ? <div className="mt-1 text-[11px] text-muted-foreground">×{c.count} • أفضل وزن {c.bestKg} كغ</div> : <div className="mt-1 text-[11px] text-muted-foreground">{f.minKg}–{f.maxKg} كغ</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LoadingScreen({ ready, onStart }: { ready: boolean; onStart: () => void }) {
  return (
    <div className="no-select absolute inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-deep px-8">
      <div className="bg-rays animate-rays pointer-events-none absolute left-1/2 top-[35%] h-[150vmax] w-[150vmax]" />
      <img src={art("logo")} alt="Fishing World" className="animate-pop relative w-72 max-w-full drop-shadow-2xl" />
      <div className="relative w-full max-w-xs">
        {ready ? (
          <button onClick={onStart} className="btn-green animate-pop w-full py-3.5 text-3xl">بدء الصيد</button>
        ) : (
          <>
            <div className="panel h-6 overflow-hidden rounded-full p-1"><div className="h-full w-2/3 animate-pulse rounded-full" style={{ background: "var(--gradient-gold)" }} /></div>
            <p className="mt-2 text-center font-display text-lg">جاري التحميل...</p>
          </>
        )}
        <div className="mt-4 flex justify-center"><DevBadge /></div>
      </div>
    </div>
  );
}
