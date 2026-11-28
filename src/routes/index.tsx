import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Anchor, Backpack, Fish, Map as MapIcon, ShieldAlert, Users, Wallet } from "lucide-react";
import { InfoLinks } from "@/components/info/InfoPage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WORLDS } from "@/game/data";
import { useAccount } from "@/game/account";
import { selectWorld } from "@/lib/game.functions";
import { art } from "@/game/art";
import { setMuted, sfx } from "@/game/sfx";
import { initTelegram, telegramProfile } from "@/game/telegram";
import { PlayScreen } from "@/components/game/PlayScreen";
import { CollectionScreen, LoadingScreen, WorldsScreen, isUnlocked } from "@/components/game/Screens";
import { BagScreen } from "@/components/game/BagScreen";
import { FriendsScreen, WalletScreen } from "@/components/game/WalletScreen";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "FeshFesh — 3D Fishing Game" },
      { name: "description", content: "3D fishing game: power-cast, fight the fish, open bait chests and collect species across ten worlds." },
      { property: "og:title", content: "FeshFesh — 3D Fishing Game" },
      { property: "og:description", content: "Cast, reel and collect fish in ten unique 3D worlds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

type Screen = "play" | "worlds" | "collection" | "bag" | "wallet" | "friends";

function Gate({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-6 bg-deep px-8 text-center" dir="ltr">
      <img src={art("logo")} alt="FeshFesh" className="w-64 max-w-full drop-shadow-2xl" />
      <div className="ribbon px-8 py-1.5 text-2xl">{title}</div>
      <p className="text-muted-foreground">{text}</p>
      <InfoLinks />
    </div>
  );
}

function Game() {
  const acc = useAccount();
  useEffect(() => { initTelegram(); }, []);
  if (acc.status === "loading" || (acc.status === "ready" && !acc.save)) return <Gate title="Logging in..." text="Verifying your Telegram account..." />;
  if (acc.status === "outside") return <Gate title="Open in Telegram" text="This game runs inside Telegram only. Open the bot and tap Play to log in automatically." />;
  if (acc.status === "error") return <Gate title="Login Failed" text={acc.error} />;
  return <GameReady acc={acc} />;
}

function GameReady({ acc }: { acc: ReturnType<typeof useAccount> }) {
  const save = acc.save!; const { update, setPlayer } = acc;
  const [screen, setScreen] = useState<Screen>("play");
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [fairPlayOpen, setFairPlayOpen] = useState(true);
  const telegramUser = telegramProfile();
  const playerName = telegramUser?.name ?? acc.player?.name ?? "Angler";
  useEffect(() => { setMuted(save.muted); }, [save.muted]);
  const world = WORLDS.find((w) => w.id === save.worldId && isUnlocked(w, save)) ?? WORLDS[0]!;
  const toggleMute = () => update((s) => ({ ...s, muted: !s.muted }));
  const nav: [Screen, string, typeof Anchor][] = [["play", "Fish", Anchor], ["worlds", "Worlds", MapIcon], ["collection", "Collection", Fish], ["bag", "Bag", Backpack], ["wallet", "Wallet", Wallet], ["friends", "Friends", Users]];
  if (acc.rules?.maintenance && !acc.isAdmin) return <Gate title="Maintenance" text="We're updating the game. Please check back in a few minutes." />;

  return (
    <div className="relative mx-auto h-[var(--tg-viewport-stable-height,100dvh)] min-h-[100dvh] w-full max-w-md overflow-hidden bg-deep text-foreground" dir="ltr">
      {screen === "play" && <PlayScreen key={world.id} world={world} save={save} update={update} onMute={toggleMute} onReady={() => setReady(true)} onPlayer={setPlayer} playerName={playerName} photoUrl={telegramUser?.photoUrl ?? null} />}
      {screen === "worlds" && <WorldsScreen save={save} onPlay={(id) => { update((s) => ({ ...s, worldId: id })); void selectWorld({ data: { worldId: id } }).catch(() => {}); setScreen("play"); }} />}
      {screen === "collection" && <CollectionScreen save={save} />}
      {screen === "bag" && acc.rules && <BagScreen save={save} onPlayer={(p) => { setPlayer(p); void acc.refresh(); }} rules={acc.rules} adsToday={acc.player?.adsToday ?? 0} />}
      {screen === "wallet" && acc.player && acc.rules && <WalletScreen player={{ ...acc.player, coins: save.coins }} rules={acc.rules} onChanged={() => void acc.refresh()} />}
      {screen === "friends" && acc.player && acc.rules && <FriendsScreen player={acc.player} rules={acc.rules} />}
      {!started && <LoadingScreen ready={ready} onStart={() => { sfx.unlock(); sfx.tap(); setStarted(true); }} />}

      <Dialog open={fairPlayOpen} onOpenChange={setFairPlayOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] border-primary/40 bg-background text-foreground sm:max-w-sm">
          <DialogHeader className="items-center text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive"><ShieldAlert className="h-6 w-6" /></div>
            <DialogTitle className="font-display text-2xl">Fair Play Rules</DialogTitle>
            <DialogDescription className="text-center">Help keep FeshFesh fair for every player.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="panel-glass p-3">One account per person. Multiple accounts are prohibited.</div>
            <div className="panel-glass p-3">Fake referrals are prohibited. Abuse may lead to suspension and removal of referral rewards.</div>
          </div>
          <Button type="button" className="btn-gold w-full" onClick={() => setFairPlayOpen(false)}>I Understand</Button>
        </DialogContent>
      </Dialog>

      <nav className="pb-safe absolute inset-x-0 bottom-0 z-30 px-2">
        <div className="panel grid grid-cols-6 gap-0.5 p-1">
          {nav.map(([id, label, Icon]) => (
            <button key={id} onClick={() => { sfx.tap(); setScreen(id); if (id === "wallet" || id === "friends") void acc.refresh(); }} className={`relative flex flex-col items-center rounded-xl py-1.5 text-[10px] font-bold transition ${screen === id ? "btn-gold" : "text-foreground/80"}`}>
              <Icon className="h-5 w-5" />{label}
              {id === "bag" && save.chests.length > 0 && <span className="absolute end-1 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{save.chests.length}</span>}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
