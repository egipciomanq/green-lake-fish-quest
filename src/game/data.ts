// DEVELOPMENT DATA — gameplay preview only. Nothing here is a real balance, currency or earnings.
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Foliage = "pine" | "palm" | "golden" | "crystal" | "ice" | "jungle" | "coral" | "cave" | "lava" | "castle";

export interface FishDef {
  id: string; name: string; rarity: Rarity; art: string; color: string;
  size: number; minKg: number; maxKg: number; xp: number; power: number;
}
export interface WorldTheme {
  skyTop: string; skyBottom: string; fog: string; water: string; sun: string; sunPos: [number, number, number];
  ground: string; foliage: Foliage; light: number; outdoor: boolean; accent: string;
}
export interface WorldDef { id: string; num: number; name: string; desc: string; unlockLevel: number; theme: WorldTheme; fish: FishDef[] }
export interface BaitDef { id: string; name: string; desc: string; boost: number; art: string }

export const RARITY_LABEL: Record<Rarity, string> = { common: "شائعة", rare: "نادرة", epic: "ملحمية", legendary: "أسطورية" };
export const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, rare: 27, epic: 10, legendary: 3 };
const XP: Record<Rarity, number> = { common: 12, rare: 35, epic: 90, legendary: 250 };
const POWER: Record<Rarity, number> = { common: 0.8, rare: 1.1, epic: 1.4, legendary: 1.8 };

type F = [id: string, name: string, art: string, color: string, size: number, minKg: number, maxKg: number];
const R: Rarity[] = ["common", "common", "rare", "epic", "legendary"];
const fishSet = (list: F[], lvl: number): FishDef[] => list.map(([id, name, a, color, size, minKg, maxKg], i) => {
  const rarity = R[i]!;
  return { id, name, art: `fish-${a}`, color, size, minKg, maxKg, rarity, xp: Math.round(XP[rarity] * (1 + lvl * 0.08)), power: POWER[rarity] };
});

const T = (t: Partial<WorldTheme> & Pick<WorldTheme, "skyTop" | "skyBottom" | "water" | "foliage">): WorldTheme => ({
  fog: t.skyBottom, sun: "#fff1cf", sunPos: [30, 18, -60], ground: "#5f9a3e", light: 2.2, outdoor: true, accent: "#f5c542", ...t,
});

export const WORLDS: WorldDef[] = [
  { id: "green-lake", num: 1, name: "البحيرة الخضراء", desc: "مياه صافية وغابات صنوبر", unlockLevel: 1,
    theme: T({ skyTop: "#4aa3e8", skyBottom: "#cfeeff", water: "#1f8f8a", foliage: "pine" }),
    fish: fishSet([["gl-carp", "الشبوط الفضي", "carp", "#9aa7ad", 1.1, 1, 4], ["gl-goldfish", "السمكة الذهبية", "goldfish", "#f2a627", 0.8, 0.3, 1.2], ["gl-koi", "كوي الأحمر", "redkoi", "#f0643a", 1, 1, 3.5], ["gl-goldkoi", "كوي الإمبراطور", "goldkoi", "#f6a33a", 1.2, 2, 6], ["gl-turtle", "سلحفاة البحيرة العتيقة", "turtle", "#5a8d3a", 1.6, 8, 25]], 1) },
  { id: "blue-ocean", num: 2, name: "المحيط الأزرق", desc: "أعماق زرقاء لا نهائية", unlockLevel: 3,
    theme: T({ skyTop: "#1f7fe0", skyBottom: "#a9dcff", water: "#0f5fb0", foliage: "palm", ground: "#e8d39a", sun: "#ffffff" }),
    fish: fishSet([["bo-tang", "الجراح الأزرق", "bluetang", "#2d5be0", 0.8, 0.3, 1], ["bo-tuna", "التونة الزرقاء", "tuna", "#4a6a9a", 1.3, 3, 15], ["bo-marlin", "المرلين", "marlin", "#3159a8", 1.6, 20, 90], ["bo-shark", "القرش الرمادي", "shark", "#7d8fa3", 1.8, 40, 150], ["bo-whale", "الحوت الأزرق الصغير", "whale", "#2a55a0", 2.2, 200, 600]], 3) },
  { id: "golden-river", num: 3, name: "النهر الذهبي", desc: "غروب ذهبي فوق الجسر", unlockLevel: 5,
    theme: T({ skyTop: "#f08a3a", skyBottom: "#ffe2a0", fog: "#ffd79a", water: "#b07a2a", foliage: "golden", sun: "#ffc46b", sunPos: [0, 6, -80], ground: "#9a8a3a", light: 1.8, accent: "#ffb43a" }),
    fish: fishSet([["gr-carp", "شبوط الغروب", "carp", "#c9a46b", 1.1, 1, 5], ["gr-gold", "الذهبية الصغيرة", "goldfish", "#ffb320", 0.8, 0.3, 1.5], ["gr-rainbow", "سمكة قوس قزح", "rainbowfish", "#ff7a3a", 0.9, 0.5, 2], ["gr-puffer", "المنتفخة الذهبية", "puffer", "#d8c08a", 1, 1, 4], ["gr-koi", "كوي النهر المقدس", "goldkoi", "#ffcc33", 1.4, 4, 12]], 5) },
  { id: "crystal-cave", num: 4, name: "كهف الكريستال", desc: "بلورات متوهجة في الظلام", unlockLevel: 8,
    theme: T({ skyTop: "#0a1a3a", skyBottom: "#1a3a7a", fog: "#12285a", water: "#1a5fc0", foliage: "crystal", outdoor: false, ground: "#2a3550", sun: "#8fd0ff", light: 1.2, accent: "#5ad1ff" }),
    fish: fishSet([["cc-angel", "الملاك البلوري", "angelfish", "#f2d23a", 0.9, 0.4, 1.5], ["cc-rainbow", "المضيئة", "rainbowfish", "#5ad1ff", 0.9, 0.3, 1.2], ["cc-seahorse", "حصان البحر الأزرق", "seahorse", "#f0a040", 0.6, 0.1, 0.4], ["cc-jelly", "قنديل الكريستال", "jellyfish", "#a46bff", 1, 0.5, 3], ["cc-octopus", "أخطبوط الكهف", "octopus", "#e8504a", 1.5, 5, 20]], 8) },
  { id: "ice-lake", num: 5, name: "البحيرة الجليدية", desc: "صيد بين الثلوج والجبال", unlockLevel: 11,
    theme: T({ skyTop: "#6aaee8", skyBottom: "#eef7ff", water: "#3f8fc0", foliage: "ice", ground: "#f2f7fb", sun: "#ffffff", light: 2.4, accent: "#9ad8ff" }),
    fish: fishSet([["il-carp", "سمك الثلج", "carp", "#b9c4cf", 1, 1, 3], ["il-tuna", "تونة الشمال", "tuna", "#6a7f9a", 1.3, 4, 18], ["il-crab", "السلطعون القطبي", "crab", "#c84a3a", 0.8, 1, 3], ["il-lobster", "الكركند الجليدي", "lobster", "#d8503a", 1, 2, 6], ["il-whale", "حوت الجليد", "whale", "#5a7fb0", 2.2, 150, 500]], 11) },
  { id: "jungle-falls", num: 6, name: "شلال الغابة", desc: "شلالات وأدغال كثيفة", unlockLevel: 14,
    theme: T({ skyTop: "#3a9ad8", skyBottom: "#c8f0d8", fog: "#a8dcc0", water: "#1f8f6a", foliage: "jungle", ground: "#3f7a2a", accent: "#7ae05a" }),
    fish: fishSet([["jf-rainbow", "سمكة الأدغال", "rainbowfish", "#ff6a3a", 0.9, 0.3, 1.5], ["jf-koi", "كوي الشلال", "redkoi", "#f05a3a", 1, 1, 4], ["jf-puffer", "منتفخة الغابة", "puffer", "#c8b880", 1, 1, 3], ["jf-lion", "سمكة الأسد", "lionfish", "#e0603a", 1.1, 1, 4], ["jf-turtle", "سلحفاة الزمرد", "turtle", "#3a9a4a", 1.6, 10, 30]], 14) },
  { id: "coral-kingdom", num: 7, name: "مملكة المرجان", desc: "شعاب ملونة وأسماك استوائية", unlockLevel: 18,
    theme: T({ skyTop: "#2a9ae8", skyBottom: "#b8ecff", water: "#10a8c8", foliage: "coral", ground: "#f0dca0", sun: "#ffffff", accent: "#ff7a5a" }),
    fish: fishSet([["ck-clown", "سمكة المهرج", "clownfish", "#ff7a1a", 0.7, 0.2, 0.6], ["ck-striped", "المخططة", "stripedfish", "#f08a2a", 0.8, 0.3, 1], ["ck-angel", "سمكة الملاك", "angelfish", "#f8d020", 0.9, 0.4, 1.5], ["ck-lion", "الأسد المرجاني", "lionfish", "#e85a3a", 1.1, 1, 3], ["ck-seahorse", "حصان البحر الملكي", "seahorse", "#f0b040", 0.8, 0.2, 0.8]], 18) },
  { id: "dark-cave", num: 8, name: "الكهف المظلم", desc: "أسرار تحت الصخور البنفسجية", unlockLevel: 22,
    theme: T({ skyTop: "#0a0618", skyBottom: "#2a1450", fog: "#1a0e38", water: "#3a1a7a", foliage: "cave", outdoor: false, ground: "#2a2440", sun: "#c08aff", light: 0.9, accent: "#b86bff" }),
    fish: fishSet([["dc-crab", "سلطعون الظل", "crab", "#8a3a5a", 0.8, 1, 3], ["dc-jelly", "قنديل الظلام", "jellyfish", "#9a5aff", 1, 0.5, 2], ["dc-lion", "أسد الكهف", "lionfish", "#a04a6a", 1.1, 1, 4], ["dc-octopus", "الأخطبوط العملاق", "octopus", "#c03a5a", 1.6, 10, 40], ["dc-shark", "قرش الأعماق", "greatshark", "#4a4a6a", 2, 80, 300]], 22) },
  { id: "volcano-lake", num: 9, name: "بحيرة البركان", desc: "حمم ومياه دافئة", unlockLevel: 27,
    theme: T({ skyTop: "#3a0a0a", skyBottom: "#ff7a3a", fog: "#a83a1a", water: "#a8401a", foliage: "lava", outdoor: false, ground: "#2a1a1a", sun: "#ff8a3a", sunPos: [0, 10, -70], light: 1.6, accent: "#ff5a1a" }),
    fish: fishSet([["vl-koi", "كوي الحمم", "redkoi", "#ff4a1a", 1, 1, 4], ["vl-crab", "السلطعون الناري", "crab", "#e8401a", 0.8, 1, 3], ["vl-lobster", "كركند البركان", "lobster", "#ff3a1a", 1.1, 2, 8], ["vl-lion", "سمكة اللهب", "lionfish", "#ff6a2a", 1.2, 2, 6], ["vl-puffer", "منتفخة الجمر الأسطورية", "puffer", "#ff8a3a", 1.5, 6, 20]], 27) },
  { id: "legend-kingdom", num: 10, name: "المملكة الأسطورية", desc: "قصر ذهبي فوق مياه سحرية", unlockLevel: 33,
    theme: T({ skyTop: "#3a8ae8", skyBottom: "#ffe8b8", water: "#18b0c8", foliage: "castle", ground: "#e8d090", sun: "#ffe08a", light: 2.4, accent: "#ffd23a" }),
    fish: fishSet([["lk-goldkoi", "كوي التاج", "goldkoi", "#ffc21a", 1.2, 3, 10], ["lk-dolphin", "الدولفين الملكي", "dolphin", "#3a7ae0", 1.8, 60, 150], ["lk-marlin", "مرلين الأساطير", "marlin", "#2a4ab0", 1.8, 50, 200], ["lk-shark", "القرش الذهبي", "greatshark", "#c8a040", 2, 100, 400], ["lk-whale", "حوت المملكة", "whale", "#3a60c0", 2.4, 300, 900]], 33) },
];

export const ALL_FISH: FishDef[] = WORLDS.flatMap((w) => w.fish);

export const BAITS: BaitDef[] = [
  { id: "worm", name: "طُعم عادي", desc: "مناسب لكل الأسماك", boost: 0, art: "bait-pellets" },
  { id: "berry", name: "طُعم التوت", desc: "يجذب الأسماك النادرة", boost: 1, art: "bait-pink" },
  { id: "premium", name: "علبة المحترفين", desc: "فرصة أعلى للملحمية", boost: 2, art: "bait-pack" },
  { id: "golden", name: "سطل ذهبي", desc: "أعلى فرصة للأسطورية", boost: 3, art: "bait-bucket" },
];

export type ChestTier = "wood" | "blue" | "gold" | "epic";
export const CHESTS: Record<ChestTier, { name: string; art: string; rolls: number; glow: string }> = {
  wood: { name: "صندوق خشبي", art: "chest-wood", rolls: 3, glow: "common" },
  blue: { name: "صندوق أزرق", art: "chest-blue", rolls: 3, glow: "rare" },
  gold: { name: "صندوق ذهبي", art: "chest-gold", rolls: 4, glow: "legendary" },
  epic: { name: "صندوق ملحمي", art: "chest-epic", rolls: 4, glow: "epic" },
};
