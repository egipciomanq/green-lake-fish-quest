import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/info/InfoPage";

export const Route = createFileRoute("/privacy")({
  head: () => infoHead("Privacy Policy", "What data FeshFesh collects, how we use it, and how we keep it safe."),
  component: () => (
    <InfoPage title="Privacy Policy">
      <p>We respect your privacy. This policy explains what data we collect when you play FeshFesh on Telegram. Last updated: November 2026.</p>
      <h2>Data We Collect</h2>
      <ul><li>From Telegram: Only your User ID, name, and username, verified via Telegram's official signature. We never access your phone number or private messages.</li><li>Gameplay data: Your level, points, caught fish, bait, and chests.</li><li>Referrals: Who invited you and who you invited.</li><li>Withdrawals: The BEP20 wallet address you submit, request amount, and status.</li></ul>
      <h2>How We Use It</h2>
      <ul><li>To manage your account and save your game progress.</li><li>To calculate rewards, referral bonuses, and process withdrawal requests.</li><li>To prevent cheating and fraud, keeping the game fair and secure for all players.</li></ul>
      <h2>Advertisements</h2>
      <p>When you choose to watch an ad, it is served through Adsgram, an ad network built for Telegram apps. Adsgram may receive your Telegram ID and basic technical details about your device to deliver ads and verify views, subject to their privacy policy.</p>
      <h2>Analytics</h2>
      <p>Our app uses privacy-friendly analytics from Lovable that do not use cookies, store nothing on your device, do not save IP addresses, and cannot identify you personally. It records visited pages, referral sources, country, browser, operating system, device type, session duration, page load speed, errors, and clicks. Detailed logs are stored for 90 days and daily summaries for one year. Lovable collects this data on our behalf, and <a className="text-accent underline" href="https://lovable.dev/privacy" target="_blank" rel="noreferrer">Lovable's Privacy Policy</a> explains how it is handled.</p>
      <h2>Storage & Sharing</h2>
      <p>Your data is stored on secure servers. We never sell your personal information. We only broadcast your wallet address when processing blockchain payout transactions.</p>
      <h2>Your Rights</h2>
      <p>You can request a copy of your data or ask to delete your account anytime by contacting support. Deleting your account will forfeit any unwithdrawn points.</p>
    </InfoPage>
  ),
});
