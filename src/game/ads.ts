// Adsgram rewarded ads for Telegram Mini Apps (https://docs.adsgram.ai). Only shown when the player taps "watch".
type Controller = { show: () => Promise<{ done: boolean; error: boolean }> };
declare global { interface Window { Adsgram?: { init: (o: { blockId: string }) => Controller } } }
let loading: Promise<void> | null = null;
function loadSdk() {
  if (window.Adsgram) return Promise.resolve();
  loading ??= new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://sad.adsgram.ai/js/sad.min.js"; s.async = true; s.onload = () => res(); s.onerror = () => { loading = null; rej(new Error("Failed to load ad")); }; document.head.appendChild(s); });
  return loading;
}
/** Resolves true only when the ad was watched to the end. */
export async function showRewardedAd(blockId: string): Promise<boolean> {
  await loadSdk();
  if (!window.Adsgram) throw new Error("Ads are not available");
  try { const r = await window.Adsgram.init({ blockId }).show(); return r.done; } catch { return false; }
}
