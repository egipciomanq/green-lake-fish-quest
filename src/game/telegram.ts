// Telegram Mini App helpers. Safe no-ops in a normal browser.
interface TgWebApp {
  ready: () => void; expand: () => void; disableVerticalSwipes?: () => void;
  setHeaderColor?: (c: string) => void; setBackgroundColor?: (c: string) => void;
  HapticFeedback?: { impactOccurred: (s: "light" | "medium" | "heavy" | "rigid" | "soft") => void; notificationOccurred: (t: "error" | "success" | "warning") => void };
}
const tg = (): TgWebApp | undefined => (typeof window === "undefined" ? undefined : (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp);

export function initTelegram() {
  const w = tg(); if (!w) return;
  try { w.ready(); w.expand(); w.disableVerticalSwipes?.(); w.setHeaderColor?.("#0b2a6b"); w.setBackgroundColor?.("#0b2a6b"); } catch { /* old client */ }
}
export const haptic = {
  light: () => tg()?.HapticFeedback?.impactOccurred("light"),
  heavy: () => tg()?.HapticFeedback?.impactOccurred("heavy"),
  success: () => tg()?.HapticFeedback?.notificationOccurred("success"),
  error: () => tg()?.HapticFeedback?.notificationOccurred("error"),
};
