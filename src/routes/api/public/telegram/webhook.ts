import { createFileRoute } from "@tanstack/react-router";

// Telegram bot webhook: answers /start with a welcome, a short guide and an "Open game" button.
async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

const WELCOME = (name: string) => `🎣 <b>Welcome to FeshFesh, ${name}!</b>

Cast your line, fight the fish and collect rare species across 10 beautiful 3D worlds.

<b>How it works</b>
• Hold to charge your cast, release to throw
• Tap fast when the float dips, then reel without snapping the line
• Every catch earns points — rarer fish earn more
• 10,000 points = 1 USD, withdraw from 1,000 points in USDT (BEP20)
• Invite friends and earn 10% of their catch points

Tap the button below to start fishing 👇
Support: @satoshyman`;

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["TELEGRAM_BOT_TOKEN"];
        if (!token) return new Response("not configured", { status: 500 });
        const expected = await sha256Hex(`feshfesh-webhook:${token}`);
        if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== expected) return new Response("Unauthorized", { status: 401 });
        const update = (await request.json().catch(() => null)) as { message?: { chat?: { id: number; type?: string }; text?: string; from?: { first_name?: string } } } | null;
        const msg = update?.message;
        if (!msg?.chat?.id || typeof msg.text !== "string") return Response.json({ ok: true });
        const [cmd, payload = ""] = msg.text.trim().split(/\s+/, 2);
        if (cmd !== "/start" && cmd !== "/help" && cmd !== "/play") return Response.json({ ok: true });
        const origin = new URL(request.url).origin;
        const ref = /^ref_[a-f0-9]{8}$/.test(payload) ? `?ref=${payload.slice(4)}` : "";
        const name = (msg.from?.first_name ?? "angler").replace(/[<>&]/g, "");
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: msg.chat.id, text: WELCOME(name), parse_mode: "HTML",
            reply_markup: { inline_keyboard: [
              [{ text: "🎮 Open FeshFesh", web_app: { url: `${origin}/${ref}` } }],
              [{ text: "📖 How it works", url: `${origin}/how-it-works` }, { text: "💬 Support", url: "https://t.me/satoshyman" }],
            ] },
          }),
        });
        return Response.json({ ok: true });
      },
    },
  },
});
