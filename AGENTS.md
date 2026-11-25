<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Game rules live in src/game/fishing.ts (no React/three, tested in fishing.test.ts); UI writes a shared mutable `Live` object (src/game/live.ts) that scene components in src/game/scene/ read each frame; React state only holds phase/UI. Dev builds expose it as window.__live for scripted playtests. Why: testable sim, no 60fps re-renders.
- World look, fish lists and unlock levels are data in src/game/data.ts (WorldTheme drives the scene); 2D art comes from the user's reference sheet via src/game/art.ts CDN pointers. Why: one place to add or retune worlds.
- Sound is synthesized WebAudio in src/game/sfx.ts; Telegram Mini App hooks (ready/expand/haptics) live in src/game/telegram.ts and are no-ops in a browser. Why: no audio files, works inside and outside Telegram.
- Gameplay balances are development data persisted in localStorage (src/game/store.ts), always labelled as preview, never as real money. Why: user requirement for Phase 1.
