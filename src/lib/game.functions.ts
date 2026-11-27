import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BAITS, WORLDS, type ChestTier } from "@/game/data";
import { castBoost, pickFish, rollChest } from "@/game/fishing";

function transactionError(message: string, fallback: string) {
  const details: [string, string][] = [
    ["out_of_bait", "Out of bait! Open a chest from your backpack"],
    ["catch_in_progress", "A fish is already on your line"],
    ["cast_cooldown", "Wait a moment before casting again"],
    ["chest_not_found", "That chest is no longer available"],
    ["chest_changed", "That chest changed. Please try again"],
    ["withdrawals_disabled", "Withdrawals are temporarily disabled"],
    ["withdrawal_below_minimum", "The amount is below the minimum withdrawal"],
    ["invalid_bep20_address", "Enter a valid BEP20 wallet address"],
    ["withdrawal_pending", "You already have a pending withdrawal request"],
    ["insufficient_balance", "Insufficient balance"],
    ["withdrawal_already_processed", "This request has already been processed"],
    ["catch_too_early", "Keep fighting the fish before claiming it"],
    ["catch_not_found", "This catch is no longer available"],
  ];
  const match = details.find(([needle]) => message.includes(needle));
  return new Error(match?.[1] ?? fallback);
}

function jsonRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export const getMe = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { loadProfile, loadSettings, toPlayer } = await import("./game.server");
  const [p, s] = await Promise.all([loadProfile(context.userId), loadSettings()]);
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  return { player: toPlayer(p), isAdmin: !!isAdmin, rules: { coinsPerUsd: s.coins_per_usd, minWithdraw: Number(s.min_withdraw_coins), dailyCap: s.daily_coin_cap, referralPercent: Number(s.referral_percent), minAccountDays: s.min_account_days, withdrawalsEnabled: s.withdrawals_enabled, maintenance: s.maintenance, feePercent: Number(s.withdraw_fee_percent), adsgramBlockId: s.adsgram_block_id, adRewardBaits: s.ad_reward_baits, adRewardCoins: s.ad_reward_coins, adDailyLimit: s.ad_daily_limit } };
});

export const castLine = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ worldId: z.string().max(40), baitId: z.string().max(20), power: z.number().min(0).max(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin, loadProfile, loadSettings } = await import("./game.server");
    const [p, s] = await Promise.all([loadProfile(context.userId), loadSettings()]);
    if (s.maintenance) throw new Error("Game is under maintenance");
    const world = WORLDS.find((w) => w.id === data.worldId);
    if (!world || p.level < world.unlockLevel) throw new Error("This world is locked");
    const bait = BAITS.find((b) => b.id === data.baitId);
    if (!bait) throw new Error("Unknown bait");
    const { fish, kg } = pickFish(world.fish, bait.boost + castBoost(data.power));
    const catchId = crypto.randomUUID();
    const { data: started, error } = await (await admin()).rpc("begin_fishing_cast", {
      _user: p.id, _bait_id: bait.id, _world_id: world.id, _catch_id: catchId, _fish_id: fish.id, _kg: kg,
    });
    if (error) throw transactionError(error.message, "The cast could not be saved. Please try again.");
    const result = jsonRecord(started);
    if (!result || typeof result["catchId"] !== "string" || !result["baits"] || typeof result["baits"] !== "object") {
      throw new Error("The cast could not be saved. Please try again.");
    }
    return { fishId: fish.id, kg, baits: result["baits"] as Record<string, number>, catchId };
  });

export const landCatch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ catchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin, loadProfile, toPlayer } = await import("./game.server");
    const p = await loadProfile(context.userId);
    const pending = p.pending_catch as { id?: string; fishId?: string; worldId?: string } | null;
    const active = pending?.id === data.catchId;
    const fish = active ? WORLDS.find((w) => w.id === pending.worldId)?.fish.find((f) => f.id === pending.fishId) : undefined;
    if (active && !fish) throw new Error("Unknown fish");
    const { data: settled, error } = await (await admin()).rpc("settle_fishing_catch", {
      _user: p.id, _catch_id: data.catchId, _rarity: fish?.rarity ?? "common", _xp_gain: fish?.xp ?? 1,
    });
    if (error) throw transactionError(error.message, "Your reward could not be confirmed. Please retry.");
    const result = jsonRecord(settled);
    if (!result || result["ok"] !== true) {
      throw new Error(result?.["error"] === "catch_timed_out" ? "This cast timed out. Please cast again." : "Your reward could not be confirmed. Please retry.");
    }
    return {
      player: toPlayer(await loadProfile(p.id)),
      coins: Number(result["coins"] ?? 0),
      referralCoins: Number(result["referralCoins"] ?? 0),
      capped: result["capped"] === true,
      isNew: result["isNew"] === true,
      record: result["record"] === true,
    };
  });

export const cancelFishingCast = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ catchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin } = await import("./game.server");
    const { error } = await (await admin()).rpc("cancel_fishing_cast", { _user: context.userId, _catch_id: data.catchId });
    if (error) throw new Error("Could not close the unfinished cast");
    return { ok: true };
  });

export const openChest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ index: z.number().int().min(0).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin, loadProfile, toPlayer } = await import("./game.server");
    const p = await loadProfile(context.userId);
    const tier = (p.chests as ChestTier[])[data.index];
    if (!tier) throw new Error("Chest not found");
    const loot = rollChest(tier);
    const { error } = await (await admin()).rpc("open_fishing_chest", {
      _user: p.id, _index: data.index, _expected_tier: tier, _loot: loot,
    });
    if (error) throw transactionError(error.message, "The chest could not be opened. Please try again.");
    return { tier, loot, player: toPlayer(await loadProfile(p.id)) };
  });

export const selectWorld = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ worldId: z.string().max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin, loadProfile } = await import("./game.server");
    const p = await loadProfile(context.userId);
    const world = WORLDS.find((w) => w.id === data.worldId);
    if (!world || p.level < world.unlockLevel) throw new Error("This world is locked");
    const { error } = await (await admin()).from("profiles").update({ world_id: world.id }).eq("id", p.id);
    if (error) throw new Error("Could not save the selected world. Please try again.");
    return { ok: true };
  });

export const getWallet = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { admin } = await import("./game.server");
  const db = await admin();
  const [w, l, refs] = await Promise.all([
    context.supabase.from("withdrawals").select("id, coins, usd, address, status, tx_hash, admin_note, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(30),
    context.supabase.from("coin_ledger").select("id, delta, reason, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(30),
    db.from("profiles").select("display_name, level, total_earned, referral_paid, created_at").eq("referred_by", context.userId).order("created_at", { ascending: false }).limit(100),
  ]);
  if (w.error || l.error || refs.error) throw new Error("Wallet history could not be loaded. Please try again.");
  return {
    withdrawals: w.data ?? [],
    ledger: l.data ?? [],
    referrals: (refs.data ?? []).map((r) => ({ name: r.display_name ?? "Player", level: r.level, earned: Number(r.total_earned), paid: Number(r.referral_paid), joined: r.created_at })),
  };
});

export const requestWithdrawal = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ coins: z.number().int().positive().max(1e9), address: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid BEP20 address") }).parse(d))
  .handler(async ({ data, context }) => {
    const { admin } = await import("./game.server");
    const { data: created, error } = await (await admin()).rpc("create_fishing_withdrawal", {
      _user: context.userId, _coins: data.coins, _address: data.address,
    });
    if (error) throw transactionError(error.message, "The withdrawal request could not be saved. Please try again.");
    const result = jsonRecord(created);
    if (!result || result["ok"] !== true) throw new Error("The withdrawal request could not be saved. Please try again.");
    return { ok: true, usd: Number(result["usd"] ?? 0) };
  });

export const getBotLink = createServerFn({ method: "GET" }).handler(async () => {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) return { username: null as string | null };
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    if (!response.ok) return { username: null as string | null };
    const result = await response.json() as { ok?: boolean; result?: { username?: string } };
    return { username: result.ok ? result.result?.username ?? null : null };
  } catch {
    return { username: null as string | null };
  }
});

/** Called only after Adsgram confirms a completed rewarded ad in its Mini App SDK. */
export const claimAdReward = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { admin, loadProfile, loadSettings, toPlayer } = await import("./game.server");
  const [p, s] = await Promise.all([loadProfile(context.userId), loadSettings()]);
  if (!s.adsgram_block_id) throw new Error("Ads are not available right now");
  if (p.ads_today >= s.ad_daily_limit) throw new Error("You reached the daily ad limit");
  const last = p.last_ad_at ? new Date(p.last_ad_at).getTime() : 0;
  if (Date.now() - last < s.ad_cooldown_seconds * 1000) throw new Error("Please wait a moment before the next ad");
  const baits = { ...(p.baits as Record<string, number>) };
  baits["worm"] = (baits["worm"] ?? 0) + s.ad_reward_baits;
  const coins = Math.max(0, Math.min(s.ad_reward_coins, s.daily_coin_cap - p.coins_today));
  const db = await admin();
  const { data: updated, error } = await db.from("profiles").update({ baits, ads_today: p.ads_today + 1, last_ad_at: new Date().toISOString(), coins_today: p.coins_today + coins }).eq("id", p.id).eq("ads_today", p.ads_today).select("id");
  if (error || !updated?.length) throw new Error("Please try again");
  if (coins > 0) {
    const { error: rewardError } = await db.rpc("add_coins", { _user: p.id, _delta: coins, _reason: "ad", _meta: {} });
    if (rewardError) throw new Error("The ad reward could not be saved. Please contact support.");
  }
  return { player: toPlayer(await loadProfile(p.id)), baits: s.ad_reward_baits, coins };
});
