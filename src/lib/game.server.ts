// Server-only helpers for the real-money game economy.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ChestTier } from "@/game/data";

export const admin = () => supabaseAdmin;

export async function loadSettings() {
  const { data, error } = await supabaseAdmin.from("app_settings").select("*").eq("id", 1).single();
  if (error || !data) throw new Error("Settings unavailable");
  return data;
}

export async function loadProfile(userId: string) {
  const { data, error } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) throw new Error("Profile not found");
  if (data.banned) throw new Error("This account is suspended");
  // reset the daily counter on a new UTC day
  const today = new Date().toISOString().slice(0, 10);
  if (data.coins_day !== today) {
    await supabaseAdmin.from("profiles").update({ coins_today: 0, coins_day: today, ads_today: 0 }).eq("id", userId);
    data.coins_today = 0; data.coins_day = today; data.ads_today = 0;
  }
  return data;
}
export type ProfileRow = Awaited<ReturnType<typeof loadProfile>>;

export function toPlayer(p: ProfileRow) {
  return {
    id: p.id, name: p.display_name ?? p.username ?? "Player", username: p.username, referralCode: p.referral_code,
    coins: Number(p.coins), coinsToday: p.coins_today, level: p.level, xp: p.xp,
    baits: (p.baits ?? {}) as Record<string, number>, chests: (p.chests ?? []) as ChestTier[],
    collection: (p.collection ?? {}) as Record<string, { fishId: string; count: number; bestKg: number }>,
    worldId: p.world_id, referralEarned: Number(p.referral_earned), totalEarned: Number(p.total_earned), createdAt: p.created_at, adsToday: p.ads_today,
  };
}
export type Player = ReturnType<typeof toPlayer>;

const enc = new TextEncoder();
async function hmac(key: Uint8Array<ArrayBuffer>, msg: string) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/** Verifies Telegram Mini App initData (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app). */
export async function verifyInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash"); if (!hash) return null;
  params.delete("hash");
  const check = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = await hmac(enc.encode("WebAppData"), botToken);
  const calc = hex(await hmac(secret, check));
  if (calc.length !== hash.length) return null;
  let diff = 0; for (let i = 0; i < calc.length; i++) diff |= calc.charCodeAt(i) ^ hash.charCodeAt(i);
  if (diff !== 0) return null;
  const authDate = Number(params.get("auth_date") ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > 86400) return null;
  const user = JSON.parse(params.get("user") ?? "null") as { id: number; username?: string; first_name?: string; last_name?: string } | null;
  if (!user?.id) return null;
  return { user, startParam: params.get("start_param") ?? "" };
}
export async function telegramPassword(id: number, botToken: string) { return hex(await hmac(enc.encode(botToken), `fw-pw:${id}`)); }
