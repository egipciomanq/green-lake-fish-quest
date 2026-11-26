import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/info/InfoPage";

export const Route = createFileRoute("/how-it-works")({
  head: () => infoHead("How It Works", "How to play, earn points, refer friends, and withdraw in FeshFesh."),
  component: () => (
    <InfoPage title="How It Works">
      <h2>1. Fishing</h2>
      <p>Hold to charge your cast power, then release. Wait for the bobber to dip, tap quickly when the "!" pops up, and reel in your catch while keeping an eye on the line tension so it doesn't snap.</p>
      <h2>2. Points</h2>
      <ul><li>Every fish you catch earns you points based on its rarity (Common, Rare, Epic, Legendary).</li><li>There is a daily catch points limit to keep things fair for everyone, resetting every day.</li><li>Every 10,000 points equals $1.</li></ul>
      <h2>3. Bait & Chests</h2>
      <p>Each cast uses one bait. You earn chests as you level up, packed with better bait that increases your odds of catching rare fish. You can also watch a short optional ad to grab some free bait.</p>
      <h2>4. Referrals</h2>
      <p>Share your invite link from the "Friends" tab. You get 10% of the fishing points earned by any friend who joins through your link, without taking anything away from their rewards.</p>
      <h2>5. Withdrawals</h2>
      <ul><li>The minimum withdrawal is 1,000 points.</li><li>Withdrawals are paid in USDT on the BEP20 network (BNB Smart Chain) only. Double-check that your wallet address is correct.</li><li>Requests are reviewed manually and usually processed within 24 to 72 hours. If a request is rejected, the points are refunded to your balance.</li></ul>
      <h2>6. Worlds</h2>
      <p>Unlock ten unique worlds as you level up, each featuring its own special fish.</p>
    </InfoPage>
  ),
});
