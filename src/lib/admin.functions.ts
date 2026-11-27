import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: { rpc: (fn: "has_role", a: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string };
async function requireAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const adminOverview = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await requireAdmin(context);
  const since = new Date(Date.now() - 86400000).toISOString();
  const [users, newUsers, pending, paid, settings, coins] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
    db.from("withdrawals").select("usd").eq("status", "pending"),
    db.from("withdrawals").select("usd").eq("status", "paid"),
    db.from("app_settings").select("*").eq("id", 1).single(),
    db.from("profiles").select("coins"),
  ]);
  const sum = (r: { usd: number }[] | null) => (r ?? []).reduce((a, x) => a + Number(x.usd), 0);
  return {
    users: users.count ?? 0, newUsers: newUsers.count ?? 0, pendingCount: pending.data?.length ?? 0, pendingUsd: sum(pending.data), paidUsd: sum(paid.data),
    totalCoins: (coins.data ?? []).reduce((a, x) => a + Number(x.coins), 0), settings: settings.data!,
  };
});

export const adminUsers = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ q: z.string().max(60).default("") }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    let q = db.from("profiles").select("id, telegram_id, username, display_name, coins, level, total_earned, referral_earned, coins_today, banned, created_at, referral_code").order("created_at", { ascending: false }).limit(100);
    const s = data.q.trim().replace(/[%,()]/g, "");
    if (s) q = /^\d+$/.test(s) ? q.eq("telegram_id", Number(s)) : q.or(`username.ilike.%${s}%,display_name.ilike.%${s}%,referral_code.eq.${s}`);
    const { data: rows } = await q;
    return (rows ?? []).map((r) => ({ ...r, coins: Number(r.coins), total_earned: Number(r.total_earned), referral_earned: Number(r.referral_earned) }));
  });

export const adminUpdateUser = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), coinsDelta: z.number().int().min(-1e9).max(1e9).optional(), banned: z.boolean().optional(), note: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    if (data.coinsDelta) { const { error } = await db.rpc("add_coins", { _user: data.id, _delta: data.coinsDelta, _reason: "admin_adjust", _meta: { by: context.userId, note: data.note ?? "" } }); if (error) throw new Error("Insufficient balance to deduct"); }
    if (data.banned !== undefined) await db.from("profiles").update({ banned: data.banned }).eq("id", data.id);
    return { ok: true };
  });

export const adminWithdrawals = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: z.enum(["pending", "paid", "rejected", "all"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    let q = db.from("withdrawals").select("*, profiles(display_name, username, telegram_id)").order("created_at", { ascending: false }).limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const adminProcessWithdrawal = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), action: z.enum(["paid", "rejected"]), txHash: z.string().max(100).optional(), note: z.string().max(300).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { error } = await db.rpc("process_fishing_withdrawal", { _id: data.id, _action: data.action, _tx_hash: data.txHash ?? "", _note: data.note ?? "" });
    if (error) throw new Error(error.message.includes("already_processed") ? "Request has already been processed" : "Could not update the request");
    return { ok: true };
  });

const settingsSchema = z.object({
  coins_per_usd: z.number().int().min(1), min_withdraw_coins: z.number().int().min(1), withdraw_fee_percent: z.number().min(0).max(90),
  withdrawals_enabled: z.boolean(), referral_percent: z.number().min(0).max(100), coins_common: z.number().int().min(0), coins_rare: z.number().int().min(0),
  coins_epic: z.number().int().min(0), coins_legendary: z.number().int().min(0), catch_cooldown_seconds: z.number().int().min(0).max(600),
  daily_coin_cap: z.number().int().min(0), maintenance: z.boolean(),
  adsgram_block_id: z.string().trim().max(40).regex(/^[\w-]*$/), ad_reward_baits: z.number().int().min(0).max(100), ad_reward_coins: z.number().int().min(0).max(1000), ad_daily_limit: z.number().int().min(0).max(200), ad_cooldown_seconds: z.number().int().min(0).max(3600),
});
export const adminSaveSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d) => settingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { error } = await db.from("app_settings").update({ ...data, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error("Failed to save settings");
    return { ok: true };
  });
