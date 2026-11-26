import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminOverview, adminProcessWithdrawal, adminSaveSettings, adminUpdateUser, adminUsers, adminWithdrawals } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Admin — FeshFesh" }, { name: "description", content: "FeshFesh control panel." }, { name: "robots", content: "noindex" },
    { property: "og:title", content: "Admin — FeshFesh" }, { property: "og:description", content: "FeshFesh control panel." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminPage,
});

type Tab = "overview" | "withdrawals" | "users" | "settings";
const input = "w-full rounded-xl border border-border bg-muted px-3 py-2 text-foreground";

function AdminPage() {
  const [state, setState] = useState<"loading" | "login" | "denied" | "ok">("loading");
  const check = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setState("login");
    const { data: ok } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
    setState(ok ? "ok" : "denied");
  }, []);
  useEffect(() => { void check(); }, [check]);
  if (state === "loading") return <Shell><p className="text-center">...</p></Shell>;
  if (state === "login") return <Shell><Login onDone={check} /></Shell>;
  if (state === "denied") return <Shell><div className="panel p-5 text-center">This account does not have admin privileges.<button className="btn-gold mt-3 w-full py-2" onClick={async () => { await supabase.auth.signOut(); setState("login"); }}>Sign out</button></div></Shell>;
  return <Panel onLogout={async () => { await supabase.auth.signOut(); setState("login"); }} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div dir="ltr" className="min-h-[100dvh] bg-deep px-4 py-8 text-foreground"><div className="mx-auto max-w-md"><div className="ribbon mx-auto mb-6 w-fit px-10 py-1.5 text-2xl">Control Panel</div>{children}</div></div>;
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  return (
    <form className="panel space-y-3 p-5" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setErr("");
      const { error } = await supabase.auth.signInWithPassword({ email, password }); setBusy(false);
      if (error) setErr("Invalid login credentials"); else onDone(); }}>
      <input dir="ltr" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      <input dir="ltr" type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button disabled={busy} className="btn-green w-full py-2.5 text-xl">{busy ? "..." : "Sign in"}</button>
    </form>
  );
}

function Panel({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const tabs: [Tab, string][] = [["overview", "Overview"], ["withdrawals", "Withdrawals"], ["users", "Players"], ["settings", "Settings"]];
  return (
    <div dir="ltr" className="min-h-[100dvh] bg-deep px-3 py-4 text-foreground">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between"><h1 className="font-display text-2xl text-stroke">FeshFesh Admin Panel</h1><button onClick={onLogout} className="text-sm underline">Logout</button></div>
        <div className="panel mb-4 grid grid-cols-4 gap-1 p-1">{tabs.map(([id, l]) => <button key={id} onClick={() => setTab(id)} className={`rounded-xl py-2 text-sm font-bold ${tab === id ? "btn-gold" : ""}`}>{l}</button>)}</div>
        {tab === "overview" && <Overview />}{tab === "withdrawals" && <Withdrawals />}{tab === "users" && <Users />}{tab === "settings" && <Settings />}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="panel p-3 text-center"><div className="font-display text-2xl text-primary">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>;
}
function Overview() {
  const [d, setD] = useState<Awaited<ReturnType<typeof adminOverview>> | null>(null);
  useEffect(() => { adminOverview().then(setD).catch(() => {}); }, []);
  if (!d) return <p>...</p>;
  return <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
    <Stat label="Total Players" value={d.users} /><Stat label="New (last 24h)" value={d.newUsers} /><Stat label="Pending Requests" value={`${d.pendingCount} ($${d.pendingUsd.toFixed(2)})`} />
    <Stat label="Total Paid" value={`$${d.paidUsd.toFixed(2)}`} /><Stat label="Coins in Player Balances" value={d.totalCoins.toLocaleString("en")} /><Stat label="Total Value" value={`$${(d.totalCoins / d.settings.coins_per_usd).toFixed(2)}`} />
  </div>;
}

type W = Awaited<ReturnType<typeof adminWithdrawals>>[number];
function Withdrawals() {
  const [status, setStatus] = useState<"pending" | "paid" | "rejected" | "all">("pending");
  const [rows, setRows] = useState<W[]>([]);
  const load = useCallback(() => { adminWithdrawals({ data: { status } }).then(setRows).catch(() => {}); }, [status]);
  useEffect(load, [load]);
  const act = async (id: string, action: "paid" | "rejected") => {
    const txHash = action === "paid" ? window.prompt("Transaction hash (TX hash) — optional") ?? undefined : undefined;
    const note = action === "rejected" ? window.prompt("Rejection reason (visible to player)") ?? undefined : undefined;
    try { await adminProcessWithdrawal({ data: { id, action, ...(txHash ? { txHash } : {}), ...(note ? { note } : {}) } }); load(); } catch (e) { alert(e instanceof Error ? e.message : "Error"); }
  };
  return <div>
    <div className="mb-3 flex gap-2">{(["pending", "paid", "rejected", "all"] as const).map((s) => <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1 text-sm ${status === s ? "btn-gold" : "panel-glass"}`}>{{ pending: "Pending", paid: "Paid", rejected: "Rejected", all: "All" }[s]}</button>)}</div>
    <div className="space-y-2">{rows.length === 0 && <p className="text-muted-foreground">No requests found</p>}
      {rows.map((w) => { const pr = w.profiles as { display_name: string | null; username: string | null; telegram_id: number | null } | null; return (
        <div key={w.id} className="panel space-y-1 p-3 text-sm">
          <div className="flex justify-between"><b>{Number(w.usd).toFixed(2)} USDT</b><span>{w.coins.toLocaleString("en")} coins • {w.status}</span></div>
          <div>{pr?.display_name} {pr?.username && `@${pr.username}`} <span className="text-muted-foreground">({pr?.telegram_id})</span></div>
          <div dir="ltr" className="flex items-center gap-2 break-all font-mono text-xs">{w.address}<button className="underline" onClick={() => navigator.clipboard.writeText(w.address)}>copy</button></div>
          <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()} {w.tx_hash && <a className="underline" dir="ltr" target="_blank" rel="noreferrer" href={`https://bscscan.com/tx/${w.tx_hash}`}>tx</a>}</div>
          {w.status === "pending" && <div className="grid grid-cols-2 gap-2 pt-1"><button onClick={() => act(w.id, "paid")} className="btn-green py-1.5">Mark as Paid</button><button onClick={() => act(w.id, "rejected")} className="rounded-xl bg-destructive py-1.5 text-destructive-foreground">Reject & Refund</button></div>}
        </div>); })}
    </div>
  </div>;
}

type U = Awaited<ReturnType<typeof adminUsers>>[number];
function Users() {
  const [q, setQ] = useState(""); const [rows, setRows] = useState<U[]>([]);
  const load = useCallback(() => { adminUsers({ data: { q } }).then(setRows).catch(() => {}); }, [q]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);
  const adjust = async (u: U) => {
    const v = window.prompt("Enter coins to add (or negative to deduct)"); if (!v) return;
    const n = parseInt(v, 10); if (!n) return;
    try { await adminUpdateUser({ data: { id: u.id, coinsDelta: n } }); load(); } catch (e) { alert(e instanceof Error ? e.message : "Error"); }
  };
  return <div>
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, username, or Telegram ID" className={`${input} mb-3`} />
    <div className="space-y-2">{rows.map((u) => (
      <div key={u.id} className={`panel p-3 text-sm ${u.banned ? "opacity-60" : ""}`}>
        <div className="flex justify-between"><b>{u.display_name} {u.username && <span className="text-muted-foreground">@{u.username}</span>}</b><span>Lv {u.level}</span></div>
        <div className="text-xs text-muted-foreground">TG {u.telegram_id ?? "—"} • Balance {u.coins.toLocaleString("en")} • Total {u.total_earned.toLocaleString("en")} • Referrals {u.referral_earned} • Today {u.coins_today}</div>
        <div className="mt-2 flex gap-2"><button onClick={() => adjust(u)} className="btn-gold px-3 py-1 text-xs">Adjust Balance</button>
          <button onClick={async () => { await adminUpdateUser({ data: { id: u.id, banned: !u.banned } }); load(); }} className="rounded-xl bg-destructive px-3 py-1 text-xs text-destructive-foreground">{u.banned ? "Unban" : "Ban"}</button></div>
      </div>))}</div>
  </div>;
}

type S = Awaited<ReturnType<typeof adminOverview>>["settings"];
const FIELDS: [keyof S, string, "num" | "bool" | "text"][] = [
  ["coins_per_usd", "Coins per $1 USD", "num"], ["min_withdraw_coins", "Min withdrawal (coins)", "num"], ["withdraw_fee_percent", "Withdrawal fee %", "num"], ["withdrawals_enabled", "Withdrawals enabled", "bool"],
  ["referral_percent", "Referral commission %", "num"], ["daily_coin_cap", "Daily fishing coin cap", "num"],
  ["coins_common", "Common fish coins", "num"], ["coins_rare", "Rare fish coins", "num"], ["coins_epic", "Epic fish coins", "num"], ["coins_legendary", "Legendary fish coins", "num"],
  ["catch_cooldown_seconds", "Cast cooldown (seconds)", "num"], ["adsgram_block_id", "Adsgram Block ID", "text"], ["ad_reward_baits", "Baits per ad", "num"], ["ad_reward_coins", "Coins per ad", "num"],
  ["ad_daily_limit", "Daily ad limit", "num"], ["ad_cooldown_seconds", "Ad cooldown (seconds)", "num"], ["maintenance", "Maintenance mode", "bool"],
];
function Settings() {
  const [s, setS] = useState<S | null>(null); const [msg, setMsg] = useState("");
  useEffect(() => { adminOverview().then((d) => setS(d.settings)).catch(() => {}); }, []);
  if (!s) return <p>...</p>;
  const save = async () => {
    setMsg("");
    const body = Object.fromEntries(FIELDS.map(([k, , t]) => [k, t === "num" ? Number(s[k]) : s[k]]));
    try { await adminSaveSettings({ data: body as never }); setMsg("Saved successfully ✓"); } catch (e) { setMsg(e instanceof Error ? e.message : "Error"); }
  };
  return <div className="panel space-y-3 p-4">
    {FIELDS.map(([k, label, t]) => (
      <label key={k} className="flex items-center justify-between gap-3 text-sm"><span>{label}</span>
        {t === "bool" ? <input type="checkbox" className="h-5 w-5" checked={!!s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} />
          : <input dir="ltr" value={String(s[k] ?? "")} onChange={(e) => setS({ ...s, [k]: e.target.value })} className={`${input} max-w-40`} />}
      </label>))}
    <button onClick={save} className="btn-green w-full py-2.5 text-xl">Save</button>{msg && <p className="text-center text-sm">{msg}</p>}
  </div>;
}
