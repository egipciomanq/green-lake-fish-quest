import { UserRound, Volume2, VolumeX } from "lucide-react";
import { Coins } from "lucide-react";
import type { Save } from "@/game/store";
import { xpForLevel } from "@/game/store";

export function DevBadge() {
  return <span className="rounded-full border border-accent/70 bg-muted/80 px-2 py-0.5 text-[10px] font-bold text-accent">DEV PREVIEW</span>;
}

export function TopHud({ save, title, onMute, playerName, photoUrl }: { save: Save; title?: string; onMute: () => void; playerName: string; photoUrl: string | null }) {
  const pct = Math.round((save.xp / xpForLevel(save.level)) * 100);
  return (
    <div className="pt-safe pointer-events-none absolute inset-x-0 top-0 z-20 px-3">
      <div className="flex items-center gap-1.5">
        <div aria-label={`Player ${playerName}`} className="panel-glass pointer-events-auto flex h-11 min-w-0 max-w-[108px] shrink-0 items-center gap-1.5 px-1.5">
          <div className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-muted-foreground">
            <UserRound className="h-4 w-4" />
            {photoUrl && <img src={photoUrl} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
          </div>
          <span className="min-w-0 truncate text-[10px] font-bold">{playerName}</span>
        </div>
        <div className="panel-glass pointer-events-auto flex flex-1 items-center gap-2 py-1.5 pe-3 ps-1.5">
          <div className="btn-gold grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg">{save.level}</div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-[11px] font-bold"><span>Level {save.level}</span><span className="text-muted-foreground">{save.xp}/{xpForLevel(save.level)} XP</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "var(--gradient-gold)" }} /></div>
          </div>
        </div>
        <button onClick={onMute} aria-label={save.muted ? "Unmute" : "Mute"} className="panel-glass pointer-events-auto grid h-11 w-11 place-items-center">
          {save.muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>
      {title && <div className="mt-2 flex items-center justify-center gap-2"><div className="ribbon px-7 py-1 text-lg">{title}</div></div>}
      <div className="mt-1 flex justify-center"><span className="panel-glass flex items-center gap-1.5 px-3 py-0.5 font-display text-base text-primary"><Coins className="h-4 w-4" />{save.coins.toLocaleString("en")}</span></div>
    </div>
  );
}

export function Burst({ count = 26, colors = ["var(--color-legendary)", "var(--color-rare)", "var(--color-epic)", "var(--color-accent)"] }: { count?: number; colors?: string[] }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="animate-burst absolute h-2.5 w-2.5 rounded-sm"
          style={{ background: colors[i % colors.length], ["--r" as string]: `${(360 / count) * i + (i % 3) * 7}deg`, ["--d" as string]: `-${110 + (i % 5) * 35}px`, animationDelay: `${(i % 4) * 40}ms` }} />
      ))}
    </div>
  );
}
