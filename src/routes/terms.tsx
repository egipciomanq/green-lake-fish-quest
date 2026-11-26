import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/info/InfoPage";

export const Route = createFileRoute("/terms")({
  head: () => infoHead("Terms & Guidelines", "Fair play rules and terms of use for FeshFesh and withdrawals."),
  component: () => (
    <InfoPage title="Terms & Guidelines">
      <p>By using FeshFesh, you agree to these terms. Last updated: November 2026.</p>
      <h2>Fair Play</h2>
      <ul><li>Only one account per person. Creating multiple accounts to farm referrals or earnings is strictly prohibited.</li><li>Using automated software, bots, cheats, or manipulating server connections is strictly prohibited.</li><li>Referral fraud, such as inviting fake accounts, is strictly prohibited.</li><li>We reserve the right to suspend any account violating these rules and cancel its points and withdrawal requests.</li></ul>
      <h2>Points & Withdrawals</h2>
      <ul><li>Points are in-game rewards that can be redeemed according to the rate shown in the wallet. We may adjust reward rates or minimum withdrawal thresholds, announced within the game.</li><li>You are responsible for the accuracy of your wallet address. Blockchain transfers cannot be reversed.</li><li>We may request verification or delay suspicious requests pending review.</li><li>The game is not an investment or a guaranteed income source, and requires no payment to participate.</li></ul>
      <h2>Ads</h2>
      <p>Ads are completely optional and only appear when you tap the "Watch Ad" button. We never show pop-up or intrusive ads during gameplay.</p>
      <h2>Age Requirement</h2>
      <p>You must be 18 years or older, or the legal age in your jurisdiction, to use the withdrawal feature.</p>
      <h2>Changes</h2>
      <p>We may update these terms from time to time. Continuing to play signifies your acceptance of the updated terms. This game is not affiliated with Telegram.</p>
    </InfoPage>
  ),
});
