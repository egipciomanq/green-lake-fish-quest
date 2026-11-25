// Artwork extracted from the Fishing World reference sheet, hosted as CDN assets.
const mods = import.meta.glob<{ url: string }>("../assets/art/*.asset.json", { eager: true, import: "default" });
const ART: Record<string, string> = {};
for (const [path, mod] of Object.entries(mods)) {
  const name = path.split("/").pop()!.replace(".webp.asset.json", "");
  ART[name] = mod.url;
}
export const art = (name: string) => ART[name] ?? "";
