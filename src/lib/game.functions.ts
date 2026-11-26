import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BAITS, WORLDS, type ChestTier, type FishDef } from "@/game/data";
import { applyXp, castBoost, coinsForCatch, coinsToUsd, pickFish, referralShare, rollChest } from "@/game/fishing";
import { admin, loadProfile, loadSettings, toPlayer } from "./game.server";

const MIN_FIGHT_MS = 2500; // a cast must last this long before it can be landed
const MAX_FIGHT_MS = 90_000;

export const getMe = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [p, s] = await Promise.all([loadProfile(context.userId), loadSettings()]);
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  return { player: toPlayer(p), isAdmin: !!isAdmin, rules: { coinsPerUsd: s.coins_per_usd, minWithdraw: Number(s.min_withdraw_coins), dailyCap: s.daily_coin_cap, referralPercent: Number(s.referral_percent), minAccountDays: s.min_account_days, withdrawalsEnabled: s.withdrawals_enabled, maintenance: s.maintenance, feePercent: Number(s.withdraw_fee_percent), adsgramBlockId: s.adsgram_block_id, adRewardBaits: s.ad_reward_baits, adRewardCoins: s.ad_reward_coins, adDailyLimit: s.ad_daily_limit } };
});

export const castLine = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ worldId: z.string().max(40), baitId: z.string().max(20), power: z.number().min(0).max(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const [p, s] = await Promise.all([loadProfile(context.userId), loadSettings()]);
    if (s.maintenance) throw new Error("Game is under maintenance");
    const world = WORLDS.find((w) => w.id === data.worldId);
    if (!world || p.level < world.unlockLevel) throw new Error("This world is locked");
    const bait = BAITS.find((b) => b.id === data.baitId); if (!bait) throw new Error("Unknown bait");
    const baits = { ...(p.baits as Record<string, number>) };
    if ((baits[bait.id] ?? 0) <= 0) throw new Error("Out of bait! Open a chest from your backpack");
    const last = p.last_catch_at ? new Date(p.last_catch_at).getTime() : 0;
    if (Date.now() - last < s.catch_cooldown_seconds * 1000) throw new Error("Wait a moment before casting again");
    baits[bait.id] = (baits[bait.id] ?? 0) - 1;
    const { fish, kg } = pickFish(world.fish, bait.boost + castBoost(data.power));
    const pending = { fishId: fish.id, worldId: world.id, kg, at: Date.now() };
    const { error } = await admin().from("profiles").update({ baits, pending_catch: pending, last_catch_at: new Date().toISOString() }).eq("id", p.id);
    if (error) throw new Error("Failed to cast");
    return { fishId: fish.id, kg, baits };
  });

export const landCatch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [p, s] = await Promise.all([loadProfile(context.userId), loadSettings()]);
  const pend = p.pending_catch as { fishId: string; worldId: string; kg: number; at: number } | null;
  if (!pend) throw new Error("No fish on the hook");
  const age = Date.now() - pend.at;
  if (age < MIN_FIGHT_MS || age > MAX_FIGHT_MS) { await admin().from("profiles").update({ pending_catch: null }).eq("id", p.id); throw new Error("This cast timed out"); }
  const fish = WORLDS.find((w) => w.id === pend.worldId)?.fish.find((f) => f.id === pend.fishId) as FishDef | undefined;
  if (!fish) throw new Error("Unknown fish");
  // claim the pending catch atomically so it can't be landed twice
  const { data: claimed } = await admin().from("profiles").update({ pending_catch: null }).eq("id", p.id).not("pending_catch", "is", null).select("id");
  if (!claimed?.length) throw new Error("This fish was already claimed");
  const coins = coinsForCatch(fish.rarity, s, p.coins_today);
  const col = { ...(p.collection as Record<string, { fishId: string; count: number; bestKg: number }>) };
  const prev = col[fish.id];
  col[fish.id] = { fishId: fish.id, count: (prev?.count ?? 0) + 1, bestKg: Math.max(prev?.bestKg ?? 0, pend.kg) };
  const prog = applyXp(p.level, p.xp, p.chests as ChestTier[], fish.xp);
  await admin().from("profiles").update({ collection: col, level: prog.level, xp: prog.xp, chests: prog.chests, coins_today: p.coins_today + coins, total_earned: Number(p.total_earned) + coins }).eq("id", p.id);
  if (coins > 0) {
    await admin().rpc("add_coins", { _user: p.id, _delta: coins, _reason: "catch", _meta: { fish: fish.id, kg: pend.kg } });
    if (p.referred_by) {
      // share on cumulative earnings so 10% of small catches isn't lost to rounding
      const owed = referralShare(Number(p.total_earned) + coins, Number(s.referral_percent)) - Number(p.referral_paid);
      if (owed > 0) {
        await admin().from("profiles").update({ referral_paid: Number(p.referral_paid) + owed }).eq("id", p.id);
        await admin().rpc("add_coins", { _user: p.referred_by, _delta: owed, _reason: "referral", _meta: { from: p.id } });
        const { data: r } = await admin().from("profiles").select("referral_earned").eq("id", p.referred_by).single();
        if (r) await admin().from("profiles").update({ referral_earned: Number(r.referral_earned) + owed }).eq("id", p.referred_by);
      }
    }
  }
  const fresh = await loadProfile(p.id);
  return { player: toPlayer(fresh), coins, capped: coins === 0, isNew: !prev, record: !!prev && pend.kg > prev.bestKg };
});

export const openChest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ index: z.number().int().min(0).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const p = await loadProfile(context.userId);
    const chests = [...(p.chests as ChestTier[])]; const tier = chests[data.index];
    if (!tier) throw new Error("Chest not found");
    chests.splice(data.index, 1);
    const loot = rollChest(tier);
    const baits = { ...(p.baits as Record<string, number>) };
    loot.forEach((x) => { baits[x.baitId] = (baits[x.baitId] ?? 0) + x.qty; });
    const { data: ok } = await admin().from("profiles").update({ chests, baits }).eq("id", p.id).eq("chests", JSON.stringify(p.chests)).select("id");
    if (!ok?.length) throw new Error("Please try again");
    return { tier, loot, player: toPlayer({ ...p, chests, baits }) };
  });

export const selectWorld = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ worldId: z.string().max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const p = await loadProfile(context.userId);
    const w = WORLDS.find((x) => x.id === data.worldId);
    if (!w || p.level < w.unlockLevel) throw new Error("This world is locked");
    await admin().from("profiles").update({ world_id: w.id }).eq("id", p.id);
    return { ok: true };
  });

export const getWallet = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [w, l, refs] = await Promise.all([
    context.supabase.from("withdrawals").select("id, coins, usd, address, status, tx_hash, admin_note, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(30),
    context.supabase.from("coin_ledger").select("id, delta, reason, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(30),
    admin().from("profiles").select("display_name, level, total_earned, created_at").eq("referred_by", context.userId).order("created_at", { ascending: false }).limit(100),
  ]);
  return { withdrawals: w.data ?? [], ledger: l.data ?? [], referrals: (refs.data ?? []).map((r) => ({ name: r.display_name ?? "Player", level: r.level, earned: Number(r.total_earned), joined: r.created_at })) };
});

export const requestWithdrawal = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ coins: z.number().int().positive().max(1e9), address: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid BEP20 address") }).parse(d))
  .handler(async ({ data, context }) => {
    const [p, s] = await Promise.all([loadProfile(context.userId), loadSettings()]);
    if (!s.withdrawals_enabled) throw new Error("Withdrawals are temporarily disabled");
    if (data.coins < Number(s.min_withdraw_coins)) throw new Error(`Minimum withdrawal is ${s.min_withdraw_coins} coins`);
    const days = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
    if (days < s.min_account_days) throw new Error(`You can withdraw after your account is ${s.min_account_days} days old`);
    const { count } = await admin().from("withdrawals").select("id", { count: "exact", head: true }).eq("user_id", p.id).eq("status", "pending");
    if ((count ?? 0) > 0) throw new Error("You already have a pending withdrawal request");
    if (Number(p.coins) < data.coins) throw new Error("Insufficient balance");
    const net = Math.floor(data.coins * (1 - Number(s.withdraw_fee_percent) / 100));
    const usd = coinsToUsd(net, s.coins_per_usd);
    const { error: e1 } = await admin().rpc("add_coins", { _user: p.id, _delta: -data.coins, _reason: "withdrawal", _meta: { address: data.address } });
    if (e1) throw new Error("Insufficient balance");
    const { error } = await admin().from("withdrawals").insert({ user_id: p.id, coins: data.coins, usd, address: data.address });
    if (error) { await admin().rpc("add_coins", { _user: p.id, _delta: data.coins, _reason: "withdrawal_refund", _meta: {} }); throw new Error("Failed to create request"); }
    return { ok: true, usd };
  });

export const getBotLink = createServerFn({ method: "GET" }).handler(async () => {
  const token = process.env["TELEGRAM_BOT_TOKEN"]; if (!token) return { username: null as string | null };
  try { const r = await fetch(`https://api.telegram.org/bot${token}/getMe`); const j = (await r.json()) as { result?: { username?: string } }; return { username: j.result?.username ?? null }; }
  catch { return { username: null }; }
});

/** Called after the player finished a rewarded ad they chose to watch. */
export const claimAdReward = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [p, s] = await Promise.all([loadProfile(context.userId), loadSettings()]);
  if (!s.adsgram_block_id) throw new Error("Ads are not available right now");
  if (p.ads_today >= s.ad_daily_limit) throw new Error("You reached the daily ad limit");
  const last = p.last_ad_at ? new Date(p.last_ad_at).getTime() : 0;
  if (Date.now() - last < s.ad_cooldown_seconds * 1000) throw new Error("Please wait a moment before the next ad");
  const baits = { ...(p.baits as Record<string, number>) };
  baits["worm"] = (baits["worm"] ?? 0) + s.ad_reward_baits;
  const coins = Math.max(0, Math.min(s.ad_reward_coins, s.daily_coin_cap - p.coins_today));
  const { data: ok } = await admin().from("profiles").update({ baits, ads_today: p.ads_today + 1, last_ad_at: new Date().toISOString(), coins_today: p.coins_today + coins }).eq("id", p.id).eq("ads_today", p.ads_today).select("id");
  if (!ok?.length) throw new Error("Please try again");
  if (coins > 0) await admin().rpc("add_coins", { _user: p.id, _delta: coins, _reason: "ad", _meta: {} });
  return { player: toPlayer(await loadProfile(p.id)), baits: s.ad_reward_baits, coins };
});
