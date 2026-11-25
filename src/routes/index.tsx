import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { BAITS, GREEN_LAKE_FISH, RARITY_LABEL, WORLDS, type FishDef, type Rarity } from "@/game/data";
import { BITE_WINDOW, pickFish, REEL_TAPS, rollChest } from "@/game/fishing";
import { addXp, useSave, xpForLevel, type Save } from "@/game/store";
import type { Phase } from "@/game/LakeScene";

const LakeScene = lazy(() => import("@/game/LakeScene").then((m) => ({ default: m.LakeScene })));
const FishPreview = lazy(() => import("@/game/LakeScene").then((m) => ({ default: m.FishPreview })));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Fishing World — البحيرة الخضراء" },
      { name: "description", content: "Play the Green Lake: cast your rod, hook rare fish, open chests and build your collection." },
      { property: "og:title", content: "Fishing World — البحيرة الخضراء" },
      { property: "og:description", content: "Cast, hook and collect fish in a 3D lake. Ten worlds to unlock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

type Screen = "play" | "worlds" | "collection" | "bag";
const RARITY_TEXT: Record<Rarity, string> = { common: "text-common", rare: "text-rare", epic: "text-epic", legendary: "text-legendary" };
const RARITY_BORDER: Record<Rarity, string> = { common: "border-common", rare: "border-rare", epic: "border-epic", legendary: "border-legendary" };

function Game() {
  const { save, update, reset } = useSave();
  const [screen, setScreen] = useState<Screen>("play");
  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-md overflow-hidden bg-background text-foreground">
      {screen === "play" && <PlayScreen save={save} update={update} />}
      {screen === "worlds" && <WorldsScreen save={save} onPlay={() => setScreen("play")} />}
      {screen === "collection" && <CollectionScreen save={save} />}
      {screen === "bag" && <BagScreen save={save} update={update} onReset={reset} />}
      <nav className="panel absolute inset-x-3 bottom-3 z-30 grid grid-cols-4 p-1.5">
        {([["play", "🎣", "صيد"], ["worlds", "🗺️", "العوالم"], ["collection", "🐟", "المجموعة"], ["bag", "🎒", "الحقيبة"]] as const).map(([id, icon, label]) => (
          <button key={id} onClick={() => setScreen(id)} className={`flex flex-col items-center rounded-xl py-1.5 text-xs font-bold transition ${screen === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <span className="text-xl leading-none">{icon}</span>{label}
            {id === "bag" && save.chests > 0 && <span className="absolute -mt-1 ms-8 h-2.5 w-2.5 rounded-full bg-destructive" />}
          </button>
        ))}
      </nav>
    </div>
  );
}

function TopBar({ save }: { save: Save }) {
  const pct = Math.round((save.xp / xpForLevel(save.level)) * 100);
  return (
    <div className="absolute inset-x-3 top-3 z-20 flex items-center gap-2">
      <div className="panel flex flex-1 items-center gap-2 px-3 py-2">
        <div className="btn-gold grid h-9 w-9 place-items-center text-lg">{save.level}</div>
        <div className="flex-1">
          <div className="flex justify-between text-[11px] text-muted-foreground"><span>المستوى</span><span>{save.xp}/{xpForLevel(save.level)} XP</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>
      <span className="panel px-2 py-1 text-[10px] font-bold text-accent">بيانات تجريبية</span>
    </div>
  );
}

function PlayScreen({ save, update }: { save: Save; update: (fn: (s: Save) => Save) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [bait, setBait] = useState("worm");
  const [taps, setTaps] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [hooked, setHooked] = useState<{ fish: FishDef; kg: number } | null>(null);
  const [reveal, setReveal] = useState<{ fish: FishDef; kg: number; isNew: boolean; record: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const timers = useRef<number[]>([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => clear, []);
  const flash = (m: string) => { setToast(m); later(1600, () => setToast(null)); };

  const onTap = useCallback(() => {
    if (phase === "idle") {
      if ((save.baits[bait] ?? 0) <= 0) { flash("لا يوجد طُعم! افتح صندوقاً من الحقيبة"); return; }
      const boost = BAITS.find((b) => b.id === bait)?.boost ?? 0;
      update((s) => ({ ...s, baits: { ...s.baits, [bait]: (s.baits[bait] ?? 0) - 1 } }));
      setHooked(pickFish(boost)); setPhase("casting");
      later(1100, () => {
        setPhase("waiting");
        later(1800 + Math.random() * 3200, () => {
          setPhase("bite");
          later(BITE_WINDOW * 1000, () => { setPhase("idle"); flash("هربت السمكة! كن أسرع 🐟💨"); });
        });
      });
    } else if (phase === "waiting") { clear(); setPhase("idle"); flash("مبكراً جداً! أخفت السمكة"); }
    else if (phase === "bite") {
      clear(); setTaps(0); setPhase("reeling");
      later(7000, () => { setPhase("idle"); flash("انقطع الخيط! اسحب أسرع"); });
    } else if (phase === "reeling") {
      const n = taps + 1; setTaps(n);
      if (n >= REEL_TAPS && hooked) {
        clear(); setPhase("caught");
        later(1000, () => {
          const prev = save.catches[hooked.fish.id];
          setReveal({ ...hooked, isNew: !prev, record: !!prev && hooked.kg > prev.bestKg });
        });
      }
    }
  }, [phase, bait, save, taps, hooked, update]);

  const collect = () => {
    if (!reveal) return;
    const { fish, kg } = reveal;
    update((s) => {
      const prev = s.catches[fish.id];
      return addXp({ ...s, catches: { ...s.catches, [fish.id]: { fishId: fish.id, count: (prev?.count ?? 0) + 1, bestKg: Math.max(prev?.bestKg ?? 0, kg) } } }, fish.xp);
    });
    setReveal(null); setPhase("idle");
  };

  const hint: Record<Phase, string> = { idle: "اضغط للرمي", casting: "...", waiting: "انتظر الغمزة...", bite: "اسحب الآن!", reeling: "اضغط بسرعة للسحب!", caught: "صيد رائع!" };

  return (
    <div className="absolute inset-0" data-scene-ready={ready ? "" : undefined}>
      <div className="absolute inset-0" onPointerDown={() => !reveal && onTap()}>
        <Suspense fallback={<div className="grid h-full place-items-center font-display text-2xl text-primary">جاري تحميل البحيرة...</div>}>
          <LakeScene phase={phase} caught={hooked?.fish ?? null} onReady={() => setReady(true)} />
        </Suspense>
      </div>
      <TopBar save={save} />
      <div className="pointer-events-none absolute inset-x-0 top-20 z-10 text-center">
        <h1 className="font-display text-3xl text-foreground drop-shadow-lg">البحيرة الخضراء</h1>
      </div>

      {toast && <div className="panel animate-pop absolute inset-x-8 top-36 z-20 p-3 text-center font-bold">{toast}</div>}

      <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 flex flex-col items-center gap-3">
        {phase === "bite" && (
          <div className="relative grid h-24 w-24 place-items-center">
            <span className="animate-pulse-ring absolute inset-0 rounded-full border-4 border-primary" />
            <span className="btn-gold grid h-20 w-20 place-items-center rounded-full text-3xl">❗</span>
          </div>
        )}
        {phase === "reeling" && (
          <div className="panel w-64 p-3">
            <div className="mb-1 text-center text-sm font-bold">اسحب! {taps}/{REEL_TAPS}</div>
            <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-accent transition-all" style={{ width: `${(taps / REEL_TAPS) * 100}%` }} /></div>
          </div>
        )}
        <div className={`panel px-5 py-2 font-display text-xl ${phase === "bite" ? "text-primary" : ""}`}>{hint[phase]}</div>
        {phase === "idle" && (
          <div className="pointer-events-auto flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
            {BAITS.map((b) => (
              <button key={b.id} onClick={() => setBait(b.id)} className={`panel flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${bait === b.id ? "ring-2 ring-primary" : "opacity-80"}`}>
                <span className="h-3 w-3 rounded-full" style={{ background: b.color }} />{b.name} ×{save.baits[b.id] ?? 0}
              </button>
            ))}
          </div>
        )}
      </div>

      {reveal && <Reveal r={reveal} onCollect={collect} />}
    </div>
  );
}

function Reveal({ r, onCollect }: { r: { fish: FishDef; kg: number; isNew: boolean; record: boolean }; onCollect: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-background/80 p-6 backdrop-blur-sm">
      <div className="bg-rays animate-rays pointer-events-none absolute left-1/2 top-1/2 h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <div className={`panel animate-pop relative w-full border-2 p-5 text-center ${RARITY_BORDER[r.fish.rarity]} glow-${r.fish.rarity}`}>
        {r.isNew && <span className="btn-gold absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-sm">سمكة جديدة!</span>}
        <p className={`font-display text-lg ${RARITY_TEXT[r.fish.rarity]}`}>{RARITY_LABEL[r.fish.rarity]}</p>
        <div className="h-44"><Suspense fallback={null}><FishPreview fish={r.fish} /></Suspense></div>
        <h2 className="font-display text-3xl">{r.fish.name}</h2>
        <p className="mt-1 text-muted-foreground">{r.kg} كغ {r.record && <span className="font-bold text-primary">• رقم قياسي!</span>}</p>
        <div className="animate-float-up mt-4 inline-block rounded-full bg-muted px-4 py-1 font-bold text-accent" style={{ animationDelay: ".4s" }}>+{r.fish.xp} XP</div>
        <button onClick={onCollect} className="btn-gold mt-5 block w-full py-3 text-xl">اجمع</button>
      </div>
    </div>
  );
}

function WorldsScreen({ save, onPlay }: { save: Save; onPlay: () => void }) {
  return (
    <div className="h-full overflow-y-auto px-4 pb-28 pt-6">
      <h1 className="font-display text-3xl">اختر العالم</h1>
      <p className="mb-4 text-sm text-muted-foreground">عشرة عوالم فريدة — ارفع مستواك لفتحها</p>
      <div className="grid grid-cols-2 gap-3">
        {WORLDS.map((w, i) => {
          const unlocked = save.level >= w.unlockLevel; const built = i === 0;
          return (
            <button key={w.id} disabled={!unlocked || !built} onClick={onPlay} className="animate-float-up relative overflow-hidden rounded-2xl border border-border text-start" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="h-24" style={{ background: `linear-gradient(180deg, ${w.sky} 0 55%, ${w.water} 55%)` }} />
              <div className="bg-card p-2.5">
                <div className="font-display text-base">{w.name}</div>
                <div className="text-[11px] text-muted-foreground">{w.desc}</div>
              </div>
              {!unlocked && <div className="absolute inset-0 grid place-items-center bg-background/70 text-center"><div><div className="text-3xl">🔒</div><div className="text-xs font-bold">المستوى {w.unlockLevel}</div></div></div>}
              {unlocked && !built && <div className="absolute inset-0 grid place-items-center bg-background/60 text-xs font-bold">قيد الإنشاء</div>}
              {unlocked && built && <span className="btn-gold absolute start-2 top-2 px-2 py-0.5 text-xs">العب</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CollectionScreen({ save }: { save: Save }) {
  const got = Object.keys(save.catches).length;
  return (
    <div className="h-full overflow-y-auto px-4 pb-28 pt-6">
      <h1 className="font-display text-3xl">مجموعة الأسماك</h1>
      <p className="mb-4 text-sm text-muted-foreground">البحيرة الخضراء • {got}/{GREEN_LAKE_FISH.length}</p>
      <div className="grid grid-cols-2 gap-3">
        {GREEN_LAKE_FISH.map((f) => {
          const c = save.catches[f.id];
          return (
            <div key={f.id} className={`panel border-2 p-3 text-center ${c ? RARITY_BORDER[f.rarity] : ""}`}>
              <div className="h-24">{c ? <Suspense fallback={null}><FishPreview fish={f} /></Suspense> : <div className="grid h-full place-items-center text-5xl opacity-40 grayscale">🐟</div>}</div>
              <div className="font-display">{c ? f.name : "؟؟؟"}</div>
              <div className={`text-xs font-bold ${RARITY_TEXT[f.rarity]}`}>{RARITY_LABEL[f.rarity]}</div>
              {c && <div className="mt-1 text-[11px] text-muted-foreground">×{c.count} • أفضل {c.bestKg} كغ</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BagScreen({ save, update, onReset }: { save: Save; update: (fn: (s: Save) => Save) => void; onReset: () => void }) {
  const [state, setState] = useState<"closed" | "shaking" | "open">("closed");
  const [loot, setLoot] = useState<{ baitId: string; qty: number }[]>([]);
  const open = () => {
    if (save.chests <= 0 || state !== "closed") return;
    setState("shaking");
    window.setTimeout(() => {
      const l = rollChest(); setLoot(l); setState("open");
      update((s) => { const baits = { ...s.baits }; l.forEach((x) => { baits[x.baitId] = (baits[x.baitId] ?? 0) + x.qty; }); return { ...s, baits, chests: s.chests - 1 }; });
    }, 1300);
  };
  return (
    <div className="h-full overflow-y-auto px-4 pb-28 pt-6">
      <h1 className="font-display text-3xl">الحقيبة</h1>
      <p className="mb-4 text-xs text-muted-foreground">مكافآت تجريبية للمعاينة فقط — ليست رصيداً حقيقياً.</p>
      <div className="panel relative overflow-hidden p-5 text-center">
        {state === "open" && <div className="bg-rays animate-rays pointer-events-none absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full" />}
        <button onClick={open} className={`relative mx-auto block text-8xl ${state === "shaking" ? "animate-shake" : ""} ${state === "open" ? "animate-pop" : ""}`}>{state === "open" ? "✨" : "🧰"}</button>
        {state === "open" ? (
          <>
            <div className="relative mt-3 grid grid-cols-3 gap-2">
              {loot.map((x, i) => { const b = BAITS.find((y) => y.id === x.baitId)!; return (
                <div key={i} className="animate-float-up rounded-xl bg-muted p-2" style={{ animationDelay: `${i * 180}ms` }}>
                  <div className="mx-auto h-8 w-8 rounded-full" style={{ background: b.color }} />
                  <div className="mt-1 text-[11px] font-bold">{b.name}</div><div className="font-display text-primary">×{x.qty}</div>
                </div>); })}
            </div>
            <button onClick={() => setState("closed")} className="btn-gold relative mt-4 w-full py-2.5 text-lg">رائع!</button>
          </>
        ) : (
          <>
            <p className="mt-2 font-display text-xl">صندوق الصياد</p>
            <p className="text-sm text-muted-foreground">لديك {save.chests} صندوق • تحصل على صندوق كل مستوى</p>
            <button onClick={open} disabled={save.chests <= 0 || state !== "closed"} className="btn-gold mt-4 w-full py-2.5 text-lg disabled:opacity-40">افتح الصندوق</button>
          </>
        )}
      </div>
      <h2 className="mb-2 mt-6 font-display text-xl">الطُعم</h2>
      <div className="space-y-2">
        {BAITS.map((b) => (
          <div key={b.id} className="panel flex items-center gap-3 p-3">
            <span className="h-10 w-10 rounded-full" style={{ background: b.color }} />
            <div className="flex-1"><div className="font-bold">{b.name}</div><div className="text-xs text-muted-foreground">{b.desc}</div></div>
            <div className="font-display text-2xl text-primary">×{save.baits[b.id] ?? 0}</div>
          </div>
        ))}
      </div>
      <button onClick={onReset} className="mt-6 w-full rounded-xl border border-border py-2 text-xs text-muted-foreground">إعادة ضبط بيانات التطوير</button>
    </div>
  );
}
