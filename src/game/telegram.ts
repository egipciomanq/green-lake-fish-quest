// Telegram Mini App helpers. Safe no-ops in a normal browser.
interface TgWebApp {
  ready: () => void; expand: () => void; disableVerticalSwipes?: () => void;
  setHeaderColor?: (c: string) => void; setBackgroundColor?: (c: string) => void;
  initDataUnsafe?: { user?: { first_name?: string; last_name?: string; username?: string; photo_url?: string } };
  HapticFeedback?: { impactOccurred: (s: "light" | "medium" | "heavy" | "rigid" | "soft") => void; notificationOccurred: (t: "error" | "success" | "warning") => void };
}
const tg = (): TgWebApp | undefined => (typeof window === "undefined" ? undefined : (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp);

export function telegramProfile() {
  const user = tg()?.initDataUnsafe?.user;
  if (!user) return null;
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || (user.username ? `@${user.username}` : "Angler");
  let photoUrl: string | null = null;
  if (user.photo_url) {
    try {
      const url = new URL(user.photo_url);
      if (url.protocol === "https:") photoUrl = url.toString();
    } catch { /* ignore invalid Telegram profile URLs */ }
  }
  return { name, photoUrl };
}

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
