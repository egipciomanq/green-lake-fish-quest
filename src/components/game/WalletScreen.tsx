import { useEffect, useState } from "react";
import { Coins, Copy, Share2, Users } from "lucide-react";
import { getBotLink, getWallet, requestWithdrawal } from "@/lib/game.functions";
import type { Player } from "@/lib/game.server";
import type { Rules } from "@/game/account";
import { coinsToUsd } from "@/game/fishing";
import { sfx } from "@/game/sfx";
import { haptic } from "@/game/telegram";
import { InfoLinks } from "@/components/info/InfoPage";

type Wallet = Awaited<ReturnType<typeof getWallet>>;
const STATUS: Record<string, string> = { pending: "Pending", paid: "Paid", rejected: "Rejected" };
const REASON: Record<string, string> = { catch: "Catch", referral: "Referral", withdrawal: "Withdrawal", withdrawal_refund: "Withdrawal Refund", admin_adjust: "Admin Adjustment" };

function Header({ title, sub }: { title: string; sub: string }) {
  return <div className="mb-4 text-center"><div className="ribbon mx-auto w-fit px-10 py-1.5 text-2xl">{title}</div><p className="mt-2 text-sm text-muted-foreground">{sub}</p></div>;
}
function useWallet() {
  const [w, setW] = useState<Wallet | null>(null);
  const load = () => getWallet().then(setW).catch(() => setW({ withdrawals: [], ledger: [], referrals: [] }));
  useEffect(() => { void load(); }, []);
  return { w, load };
}

export function WalletScreen({ player, rules, onChanged }: { player: Player; rules: Rules; onChanged: () => void }) {
  const { w, load } = useWallet();
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const usd = coinsToUsd(player.coins, rules.coinsPerUsd);
  const pct = Math.min(100, Math.round((player.coins / rules.minWithdraw) * 100));
  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await requestWithdrawal({ data: { coins: Math.floor(Number(amount)), address: address.trim() } });
      sfx.xp(); haptic.success(); setMsg({ t: `Withdrawal request for ${r.usd} USDT submitted — will be reviewed shortly`, ok: true }); setAmount(""); onChanged(); void load();
    } catch (e) { haptic.error(); setMsg({ t: e instanceof Error ? e.message : "Error" }); }
    setBusy(false);
  };
  return (
    <div className="pt-safe h-full overflow-y-auto px-4 pb-32">
      <Header title="Wallet" sub={`${rules.coinsPerUsd.toLocaleString("en")} coins = $1 • Withdrawal via USDT (BEP20)`} />
      <div className="panel glow-legendary p-4 text-center">
        <div className="flex items-center justify-center gap-2 font-display text-4xl text-primary"><Coins className="h-8 w-8" />{player.coins.toLocaleString("en")}</div>
        <div className="mt-1 text-sm text-muted-foreground">≈ {usd.toFixed(2)} USDT</div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--gradient-gold)" }} /></div>
        <div className="mt-1 text-xs text-muted-foreground">Minimum withdrawal: {rules.minWithdraw.toLocaleString("en")} coins</div>
        <div className="mt-2 text-xs">Today's coins from fishing: {player.coinsToday} / {rules.dailyCap}</div>
      </div>

      <h2 className="mb-2 mt-5 font-display text-xl text-stroke">Request Withdrawal</h2>
      <div className="panel space-y-2 p-3">
        <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder={`Number of coins (${rules.minWithdraw}+)`} className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-foreground placeholder:text-muted-foreground" />
        <input dir="ltr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x... BEP20 wallet address" className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground" />
        {amount && <div className="text-xs text-muted-foreground">You will receive ≈ {coinsToUsd(Math.floor(Number(amount) * (1 - rules.feePercent / 100)), rules.coinsPerUsd).toFixed(2)} USDT</div>}
        <button disabled={busy || !rules.withdrawalsEnabled || player.coins < rules.minWithdraw} onClick={submit} className="btn-green w-full py-3 text-xl disabled:opacity-50">
          {!rules.withdrawalsEnabled ? "Withdrawals temporarily paused" : player.coins < rules.minWithdraw ? "Collect more coins" : busy ? "Submitting..." : "Withdraw Now"}
        </button>
        <button onClick={() => setAmount(String(player.coins))} className="w-full text-xs text-accent underline">Withdraw full balance</button>
        {msg && <div className={`rounded-xl p-2 text-center text-sm font-bold ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.t}</div>}
      </div>

      <h2 className="mb-2 mt-5 font-display text-xl text-stroke">Withdrawal Requests</h2>
      <div className="space-y-2">
        {w?.withdrawals.length ? w.withdrawals.map((x) => (
          <div key={x.id} className="panel-glass flex items-center justify-between p-2.5 text-sm">
            <div><div className="font-bold">{Number(x.usd).toFixed(2)} USDT</div><div dir="ltr" className="text-[10px] text-muted-foreground">{x.address.slice(0, 8)}…{x.address.slice(-6)}</div>
              {x.admin_note && <div className="text-[11px] text-muted-foreground">{x.admin_note}</div>}</div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${x.status === "paid" ? "bg-primary text-primary-foreground" : x.status === "rejected" ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}>{STATUS[x.status]}</span>
          </div>)) : <div className="panel-glass p-3 text-center text-sm text-muted-foreground">No requests yet</div>}
      </div>

      <h2 className="mb-2 mt-5 font-display text-xl text-stroke">Recent Activity</h2>
      <div className="space-y-1">
        {w?.ledger.map((l) => (
          <div key={l.id} className="flex justify-between border-b border-border/40 py-1.5 text-sm">
            <span>{REASON[l.reason] ?? l.reason}</span><span className={l.delta > 0 ? "text-primary" : "text-destructive"} dir="ltr">{l.delta > 0 ? "+" : ""}{l.delta}</span>
          </div>))}
      </div>
    </div>
  );
}

export function FriendsScreen({ player, rules }: { player: Player; rules: Rules }) {
  const { w } = useWallet();
  const [bot, setBot] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { getBotLink().then((r) => setBot(r.username)).catch(() => {}); }, []);
  const link = bot ? `https://t.me/${bot}?start=ref_${player.referralCode}` : "";
  const copy = async () => { if (!link) return; await navigator.clipboard.writeText(link).catch(() => {}); setCopied(true); haptic.success(); window.setTimeout(() => setCopied(false), 1500); };
  const share = () => {
    if (!link) return;
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Come play FeshFesh with me and catch some fish!")}`;
    const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } } }).Telegram?.WebApp;
    if (tg?.openTelegramLink) tg.openTelegramLink(url); else window.open(url, "_blank");
  };
  return (
    <div className="pt-safe h-full overflow-y-auto px-4 pb-32">
      <Header title="Friends" sub={`Earn ${rules.referralPercent}% of all coins earned by invited friends — for life`} />
      <div className="grid grid-cols-2 gap-2">
        <div className="panel p-3 text-center"><Users className="mx-auto h-6 w-6 text-primary" /><div className="font-display text-3xl">{w?.referrals.length ?? 0}</div><div className="text-xs text-muted-foreground">Friends</div></div>
        <div className="panel p-3 text-center"><Coins className="mx-auto h-6 w-6 text-primary" /><div className="font-display text-3xl">{player.referralEarned.toLocaleString("en")}</div><div className="text-xs text-muted-foreground">Referral Coins</div></div>
      </div>
      <div className="panel mt-4 space-y-2 p-3">
        <div className="text-sm font-bold">Your Invite Link</div>
        <div dir="ltr" className="truncate rounded-xl bg-muted px-3 py-2 font-mono text-xs">{link || "..."}</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={share} className="btn-green flex items-center justify-center gap-2 py-2.5 text-lg"><Share2 className="h-5 w-5" />Share</button>
          <button onClick={copy} className="btn-gold flex items-center justify-center gap-2 py-2.5 text-lg"><Copy className="h-5 w-5" />{copied ? "Copied" : "Copy"}</button>
        </div>
      </div>
      <h2 className="mb-2 mt-5 font-display text-xl text-stroke">Your Friends</h2>
      <div className="space-y-2">
        {w?.referrals.length ? w.referrals.map((r, i) => (
          <div key={i} className="panel-glass flex items-center justify-between p-2.5 text-sm">
            <div><div className="font-bold">{r.name}</div><div className="text-[11px] text-muted-foreground">Level {r.level}</div></div>
            <div className="text-primary">+{Math.floor((r.earned * rules.referralPercent) / 100)}</div>
          </div>)) : <div className="panel-glass p-3 text-center text-sm text-muted-foreground">Invite your friends and start earning from their catches</div>}
      </div>
      <div className="mt-8"><InfoLinks /></div>
    </div>
  );
}
