import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/info/InfoPage";

export const Route = createFileRoute("/about")({
  head: () => infoHead("About Us", "Meet the team behind FeshFesh, a 3D fishing game on Telegram."),
  component: () => (
    <InfoPage title="About Us">
      <p>FeshFesh is a 3D fishing game running directly inside Telegram. Our goal is to provide a fun, fair experience where every player gets rewarded for their time and skill.</p>
      <h2>What We Offer</h2>
      <ul><li>Ten different worlds with dozens of unique fish species.</li><li>Clear rewards with transparent values and USDT withdrawals on the BEP20 network.</li><li>A transparent referral system that rewards you for inviting friends.</li><li>Optional ads only, with zero interruptions during gameplay.</li></ul>
      <h2>Our Commitment</h2>
      <p>The game is 100% free to play with no deposits or payments required. We review every withdrawal request carefully and answer inquiries through our official support channel.</p>
    </InfoPage>
  ),
});
