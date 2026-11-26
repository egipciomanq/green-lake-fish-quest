import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const SUPPORT = "satoshyman";
export const INFO_LINKS = [
  { to: "/how-it-works", label: "How It Works" },
  { to: "/terms", label: "Rules & Terms" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/about", label: "About Us" },
] as const;

export function InfoLinks() {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {INFO_LINKS.map((l) => <Link key={l.to} to={l.to} className="underline">{l.label}</Link>)}
      <a href={`https://t.me/${SUPPORT}`} target="_blank" rel="noreferrer" className="underline">Support @{SUPPORT}</a>
    </div>
  );
}

export function InfoPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div dir="ltr" className="min-h-[100dvh] bg-deep px-4 py-6 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-sm text-accent underline">← Back to game</Link>
        <div className="ribbon mx-auto my-5 w-fit px-10 py-1.5 text-2xl">{title}</div>
        <article className="panel space-y-4 p-5 leading-7 [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-primary [&_li]:ms-5 [&_li]:list-disc">{children}</article>
        <p className="mt-4 text-center text-sm">Contact & support: <a className="text-accent underline" href={`https://t.me/${SUPPORT}`} target="_blank" rel="noreferrer">@{SUPPORT}</a></p>
        <div className="mt-4"><InfoLinks /></div>
      </div>
    </div>
  );
}

export const infoHead = (title: string, description: string) => ({
  meta: [
    { title: `${title} — FeshFesh` }, { name: "description", content: description },
    { property: "og:title", content: `${title} — FeshFesh` }, { property: "og:description", content: description },
    { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
  ],
});
