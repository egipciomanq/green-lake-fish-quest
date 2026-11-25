import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Anchor, Backpack, Fish, Map as MapIcon } from "lucide-react";
import { WORLDS } from "@/game/data";
import { useSave } from "@/game/store";
import { setMuted, sfx } from "@/game/sfx";
import { initTelegram } from "@/game/telegram";
import { PlayScreen } from "@/components/game/PlayScreen";
import { CollectionScreen, LoadingScreen, WorldsScreen, isUnlocked } from "@/components/game/Screens";
import { BagScreen } from "@/components/game/BagScreen";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Fishing World — عالم الصيد" },
      { name: "description", content: "3D fishing game: power-cast, fight the fish, open bait chests and collect species across ten worlds." },
      { property: "og:title", content: "Fishing World — عالم الصيد" },
      { property: "og:description", content: "Cast, reel and collect fish in ten unique 3D worlds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

type Screen = "play" | "worlds" | "collection" | "bag";

function Game() {
  const { save, update, reset } = useSave();
  const [screen, setScreen] = useState<Screen>("play");
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  useEffect(() => { initTelegram(); }, []);
  useEffect(() => { setMuted(save.muted); }, [save.muted]);
  const world = WORLDS.find((w) => w.id === save.worldId && isUnlocked(w, save)) ?? WORLDS[0]!;
  const toggleMute = () => update((s) => ({ ...s, muted: !s.muted }));
  const nav: [Screen, string, typeof Anchor][] = [["play", "صيد", Anchor], ["worlds", "العوالم", MapIcon], ["collection", "المجموعة", Fish], ["bag", "الحقيبة", Backpack]];

  return (
    <div className="relative mx-auto h-[var(--tg-viewport-stable-height,100dvh)] min-h-[100dvh] w-full max-w-md overflow-hidden bg-deep text-foreground">
      {screen === "play" && <PlayScreen key={world.id} world={world} save={save} update={update} onMute={toggleMute} onReady={() => setReady(true)} />}
      {screen === "worlds" && <WorldsScreen save={save} update={update} onPlay={(id) => { update((s) => ({ ...s, worldId: id })); setScreen("play"); }} />}
      {screen === "collection" && <CollectionScreen save={save} />}
      {screen === "bag" && <BagScreen save={save} update={update} onReset={reset} />}
      {!started && <LoadingScreen ready={ready} onStart={() => { sfx.unlock(); sfx.tap(); setStarted(true); }} />}

      <nav className="pb-safe absolute inset-x-0 bottom-0 z-30 px-3">
        <div className="panel grid grid-cols-4 gap-1 p-1.5">
          {nav.map(([id, label, Icon]) => (
            <button key={id} onClick={() => { sfx.tap(); setScreen(id); }} className={`relative flex flex-col items-center rounded-xl py-1.5 text-xs font-bold transition ${screen === id ? "btn-gold" : "text-foreground/80"}`}>
              <Icon className="h-5 w-5" />{label}
              {id === "bag" && save.chests.length > 0 && <span className="absolute end-3 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{save.chests.length}</span>}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
