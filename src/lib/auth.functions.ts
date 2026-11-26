import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { admin, telegramPassword, verifyInitData } from "./game.server";

/** Signs a Telegram Mini App user in (creating the account on first visit) and returns a session. */
export const telegramSignIn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ initData: z.string().min(10).max(4096), ref: z.string().regex(/^[a-f0-9]{8}$/).optional() }).parse(d))
  .handler(async ({ data }) => {
    const token = process.env["TELEGRAM_BOT_TOKEN"];
    if (!token) throw new Error("Bot token missing");
    const v = await verifyInitData(data.initData, token);
    if (!v) throw new Error("Could not verify Telegram account");
    const email = `tg${v.user.id}@telegram.fishingworld.app`;
    const password = await telegramPassword(v.user.id, token);
    const name = [v.user.first_name, v.user.last_name].filter(Boolean).join(" ") || v.user.username || `Player ${v.user.id}`;
    const ref = v.startParam.startsWith("ref_") ? v.startParam.slice(4) : (data.ref ?? "");
    const url = process.env["SUPABASE_URL"]!; const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const pub = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(input, { ...init, headers: h }); } },
    });
    let res = await pub.auth.signInWithPassword({ email, password });
    if (res.error) {
      const { error } = await admin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { telegram_id: String(v.user.id), username: v.user.username ?? null, display_name: name, ref } });
      if (error && !/already/i.test(error.message)) throw new Error("Could not create account");
      res = await pub.auth.signInWithPassword({ email, password });
      if (res.error || !res.data.session) throw new Error("Could not sign in");
    }
    await admin().from("profiles").update({ display_name: name, username: v.user.username ?? null }).eq("telegram_id", v.user.id);
    return { access_token: res.data.session!.access_token, refresh_token: res.data.session!.refresh_token };
  });
