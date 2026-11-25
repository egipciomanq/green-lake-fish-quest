import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { art } from "@/game/art";
import { BAITS, type FishDef, type WorldDef } from "@/game/data";
import { BITE_WINDOW, castBoost, newReel, pickFish, PERFECT_CAST, REEL, stepReel, type ReelState } from "@/game/fishing";
import { CAST_TIME, createLive, now, type Phase } from "@/game/live";
import { addXp, type Save } from "@/game/store";
import { sfx } from "@/game/sfx";
import { haptic } from "@/game/telegram";
import { TopHud } from "./Hud";
import { Reveal, type RevealData } from "./Reveal";

const LakeScene = lazy(() => import("@/game/LakeScene").then((m) => ({ default: m.LakeScene })));

const HINT: Record<Phase, string> = {
  idle: "اضغط مطولاً للرمي", charging: "أفلت للرمي!", casting: "...", waiting: "انتظر الغمزة...",
  bite: "اسحب الآن!", reeling: "اضغط مطولاً للسحب — أفلت عند الشد", caught: "صيد رائع!", lost: "",
};

export function PlayScreen({ world, save, update, onMute, onReady }: { world: WorldDef; save: Save; update: (fn: (s: Save) => Save) => void; onMute: () => void; onReady: () => void }) {
  const live = useRef(createLive()).current;
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [bait, setBait] = useState("worm");
  const [toast, setToast] = useState<{ text: string; good?: boolean } | null>(null);
  const [hooked, setHooked] = useState<{ fish: FishDef; kg: number } | null>(null);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const timers = useRef<number[]>([]);
  const raf = useRef(0);
  const powerBar = useRef<HTMLDivElement>(null);
  const tensionBar = useRef<HTMLDivElement>(null);
  const progressBar = useRef<HTMLDivElement>(null);
  const reel = useRef<ReelState>(newReel());
  const hookedRef = useRef(hooked); hookedRef.current = hooked;
  const saveRef = useRef(save); saveRef.current = save;

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; cancelAnimationFrame(raf.current); };
  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => clear, []);
  useEffect(() => { if (import.meta.env.DEV) (window as unknown as { __live: unknown }).__live = live; }, [live]);
  const setPhase = (p: Phase) => { live.phase = p; live.phaseAt = now(); setPhaseState(p); };
  const flash = (text: string, good = false) => { setToast({ text, good }); window.setTimeout(() => setToast(null), 1700); };
  const lose = (text: string) => { clear(); setPhase("lost"); flash(text); later(900, () => setPhase("idle")); };

  // ---- charging power meter (ping-pong) ----
  const startCharge = () => {
    if ((saveRef.current.baits[bait] ?? 0) <= 0) { flash("نفد هذا الطُعم! افتح صندوقاً من الحقيبة"); haptic.error(); return; }
    setPhase("charging"); const t0 = now(); let lastTick = 0;
    const loop = () => {
      const t = (now() - t0) / 1.1; const p = 1 - Math.abs((t % 2) - 1);
      live.power = p;
      if (powerBar.current) { powerBar.current.style.height = `${p * 100}%`; powerBar.current.dataset["perfect"] = p >= PERFECT_CAST ? "1" : "0"; }
      if (now() - lastTick > 0.09) { lastTick = now(); sfx.charge(p); }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };

  const releaseCast = () => {
    cancelAnimationFrame(raf.current);
    const power = Math.max(0.15, live.power); live.castPower = power;
    const perfect = castBoost(power) > 0;
    const boost = (BAITS.find((b) => b.id === bait)?.boost ?? 0) + castBoost(power);
    update((s) => ({ ...s, baits: { ...s.baits, [bait]: Math.max(0, (s.baits[bait] ?? 0) - 1) } }));
    setHooked(pickFish(world.fish, boost));
    setPhase("casting"); sfx.cast(); haptic.light();
    if (perfect) flash("رمية مثالية! فرصة أعلى للنادر", true);
    later(CAST_TIME * 1000, () => {
      sfx.splash(); setPhase("waiting");
      const biteAt = 1800 + Math.random() * 3500;
      const nibbles = Math.floor(Math.random() * 3);
      for (let i = 0; i < nibbles; i++) later(500 + Math.random() * (biteAt - 700), () => { live.nibbleAt = now(); sfx.nibble(); haptic.light(); });
      later(biteAt, () => {
        setPhase("bite"); sfx.bite(); haptic.heavy();
        later(BITE_WINDOW * 1000, () => { sfx.escape(); lose("هربت السمكة! اسحب أسرع عند الغمزة"); });
      });
    });
  };

  const startReel = () => {
    clear(); setPhase("reeling"); reel.current = newReel(); live.holding = true;
    let last = now(); let lastTick = 0; let lastStrain = 0;
    const power = hookedRef.current?.fish.power ?? 1;
    const loop = () => {
      const t = now(); const dt = Math.min(t - last, 0.05); last = t;
      const { state, result } = stepReel(reel.current, live.holding, dt, power);
      reel.current = state; live.tension = state.tension; live.progress = state.progress;
      if (tensionBar.current) { tensionBar.current.style.width = `${state.tension * 100}%`; tensionBar.current.dataset["danger"] = state.tension > REEL.SAFE ? "1" : "0"; }
      if (progressBar.current) progressBar.current.style.width = `${state.progress * 100}%`;
      if (live.holding && t - lastTick > 0.07) { lastTick = t; sfx.reel(); }
      if (state.tension > 0.8 && t - lastStrain > 0.22) { lastStrain = t; sfx.strain(); haptic.light(); }
      if (result === "landed") { landed(); return; }
      if (result === "snapped") { sfx.snap(); haptic.error(); lose("انقطع الخيط! أفلت عندما يشتد الشد"); return; }
      if (result === "escaped") { sfx.escape(); lose("أفلتت السمكة! اسحب بشكل متواصل"); return; }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };

  const landed = () => {
    clear(); setPhase("caught"); sfx.catch(); haptic.success();
    const h = hookedRef.current; if (!h) return;
    later(1150, () => {
      const prev = saveRef.current.catches[h.fish.id];
      setReveal({ ...h, isNew: !prev, record: !!prev && h.kg > prev.bestKg });
    });
  };

  const onDown = useCallback(() => {
    sfx.unlock(); if (reveal) return;
    if (live.phase === "idle") startCharge();
    else if (live.phase === "waiting") { sfx.escape(); lose("مبكراً جداً! أخفت السمكة"); }
    else if (live.phase === "bite") startReel();
    else if (live.phase === "reeling") live.holding = true;
  }, [reveal, bait]); // eslint-disable-line react-hooks/exhaustive-deps
  const onUp = useCallback(() => {
    if (live.phase === "charging") releaseCast();
    else if (live.phase === "reeling") live.holding = false;
  }, [bait]); // eslint-disable-line react-hooks/exhaustive-deps

  const collect = () => {
    if (!reveal) return; const { fish, kg } = reveal;
    update((s) => {
      const prev = s.catches[fish.id];
      return addXp({ ...s, catches: { ...s.catches, [fish.id]: { fishId: fish.id, count: (prev?.count ?? 0) + 1, bestKg: Math.max(prev?.bestKg ?? 0, kg) } } }, fish.xp);
    });
    sfx.xp(); setReveal(null); setPhase("idle");
  };

  return (
    <div className="no-select absolute inset-0">
      <div className="absolute inset-0 bg-deep">
        <Suspense fallback={null}>
          <LakeScene world={world} live={live} onReady={onReady} fishColor={hooked?.fish.color ?? "#f0a040"} fishSize={hooked?.fish.size ?? 1} />
        </Suspense>
      </div>
      {/* full-screen touch layer */}
      <div className="absolute inset-0 z-10" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp} onContextMenu={(e) => e.preventDefault()} />

      <TopHud save={save} title={world.name} onMute={onMute} />

      {toast && <div className={`panel animate-pop absolute inset-x-6 top-[30%] z-20 p-3 text-center text-lg font-bold ${toast.good ? "text-primary" : ""}`}>{toast.text}</div>}

      {/* power meter */}
      {(phase === "charging") && (
        <div className="pointer-events-none absolute bottom-48 start-4 z-20 flex flex-col items-center gap-1">
          <span className="font-display text-sm text-primary text-stroke">القوة</span>
          <div className="panel relative h-48 w-7 overflow-hidden rounded-full p-1">
            <div className="absolute inset-x-1 top-1 rounded-full bg-accent/40" style={{ height: `${(1 - PERFECT_CAST) * 100}%` }} />
            <div ref={powerBar} className="absolute inset-x-1 bottom-1 rounded-full transition-none data-[perfect=1]:shadow-[0_0_16px_var(--color-accent)]" style={{ height: "0%", background: "var(--gradient-gold)" }} />
          </div>
        </div>
      )}

      {/* reeling meters */}
      {phase === "reeling" && (
        <div className="pointer-events-none absolute inset-x-6 top-[26%] z-20 space-y-2">
          <div className="panel-glass p-2.5">
            <div className="mb-1 flex justify-between text-xs font-bold"><span>المسافة</span><span>🐟</span></div>
            <div className="h-3 overflow-hidden rounded-full bg-muted"><div ref={progressBar} className="h-full rounded-full" style={{ width: "15%", background: "var(--gradient-green)" }} /></div>
          </div>
          <div className="panel-glass p-2.5">
            <div className="mb-1 flex justify-between text-xs font-bold"><span>شد الخيط</span><span className="text-destructive">خطر</span></div>
            <div className="relative h-3 overflow-hidden rounded-full bg-muted">
              <div className="absolute inset-y-0 end-0 bg-destructive/40" style={{ width: `${(1 - REEL.SAFE) * 100}%` }} />
              <div ref={tensionBar} className="relative h-full rounded-full bg-primary data-[danger=1]:bg-destructive" style={{ width: "20%" }} />
            </div>
          </div>
        </div>
      )}

      {/* action button + bait */}
      <div className="pb-safe pointer-events-none absolute inset-x-0 bottom-20 z-20 flex flex-col items-center gap-3 px-4">
        {phase === "bite" ? (
          <div className="relative grid h-24 w-24 place-items-center">
            <span className="animate-pulse-ring absolute inset-0 rounded-full border-4 border-primary" />
            <span className="btn-gold animate-heartbeat grid h-20 w-20 place-items-center rounded-full text-4xl">!</span>
          </div>
        ) : null}
        {HINT[phase] && (
          <div className={`${phase === "idle" || phase === "reeling" ? "btn-green" : "panel-glass"} px-7 py-2.5 text-center font-display text-xl ${phase === "bite" ? "text-primary" : ""}`}>{HINT[phase]}</div>
        )}
        {phase === "idle" && (
          <div className="pointer-events-auto flex max-w-full gap-2 overflow-x-auto px-1 pb-1 pt-3" onPointerDown={(e) => e.stopPropagation()}>
            {BAITS.map((b) => (
              <button key={b.id} onClick={() => { sfx.tap(); setBait(b.id); }} className={`panel relative flex shrink-0 flex-col items-center p-1 ${bait === b.id ? "ring-4 ring-primary" : "opacity-80"}`}>
                <img src={art(b.art)} alt={b.name} className="h-11 w-11 object-contain drop-shadow-md" />
                <span className="absolute -top-2.5 end-1 z-10 min-w-6 rounded-full border-2 border-background bg-primary px-1.5 text-center text-xs leading-5 shadow-md font-black text-primary-foreground">{save.baits[b.id] ?? 0}</span>
                <span className="mt-0.5 w-16 truncate text-center text-[10px] font-bold">{b.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {reveal && <Reveal r={reveal} onCollect={collect} />}
    </div>
  );
}
