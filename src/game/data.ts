// DEVELOPMENT DATA — gameplay preview only. No value here is a real balance or money.
export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface FishDef {
  id: string; name: string; rarity: Rarity; color: string; belly: string;
  size: number; minKg: number; maxKg: number; xp: number;
}
export interface WorldDef { id: string; name: string; desc: string; sky: string; water: string; unlockLevel: number }
export interface BaitDef { id: string; name: string; desc: string; boost: number; color: string }

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "شائعة", rare: "نادرة", epic: "ملحمية", legendary: "أسطورية",
};
export const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, rare: 27, epic: 10, legendary: 3 };

export const GREEN_LAKE_FISH: FishDef[] = [
  { id: "perch", name: "الفرخ الذهبي", rarity: "common", color: "#d9a441", belly: "#f4e2b0", size: 0.8, minKg: 0.3, maxKg: 1.2, xp: 10 },
  { id: "carp", name: "الشبوط الأخضر", rarity: "common", color: "#6f8f4e", belly: "#d8d9a8", size: 1.1, minKg: 1, maxKg: 4, xp: 12 },
  { id: "tilapia", name: "البلطي الفضي", rarity: "common", color: "#9aa7ad", belly: "#e9eef0", size: 0.9, minKg: 0.4, maxKg: 1.8, xp: 10 },
  { id: "trout", name: "السلمون المرقط", rarity: "rare", color: "#c97a6a", belly: "#f6d9cf", size: 1, minKg: 1, maxKg: 3.5, xp: 30 },
  { id: "bass", name: "القاروص الزمردي", rarity: "rare", color: "#2f7d5b", belly: "#cde6c9", size: 1.15, minKg: 1.5, maxKg: 5, xp: 35 },
  { id: "pike", name: "الكراكي المفترس", rarity: "epic", color: "#4f6b3a", belly: "#e2e6b8", size: 1.5, minKg: 3, maxKg: 12, xp: 80 },
  { id: "koi", name: "كوي الإمبراطور", rarity: "epic", color: "#e8562a", belly: "#fff3e6", size: 1.1, minKg: 2, maxKg: 6, xp: 90 },
  { id: "sturgeon", name: "حفش البحيرة الملكي", rarity: "legendary", color: "#3b4a5a", belly: "#c9d3dc", size: 1.8, minKg: 10, maxKg: 40, xp: 250 },
];

export const WORLDS: WorldDef[] = [
  { id: "green-lake", name: "البحيرة الخضراء", desc: "مياه هادئة وغابات صنوبر", sky: "#bfe3d9", water: "#2f8f83", unlockLevel: 1 },
  { id: "misty-river", name: "النهر الضبابي", desc: "تيارات باردة بين الصخور", sky: "#cfd8dc", water: "#557a8a", unlockLevel: 3 },
  { id: "desert-oasis", name: "واحة الصحراء", desc: "كنوز تحت النخيل", sky: "#f6dcae", water: "#3aa6a0", unlockLevel: 5 },
  { id: "coral-reef", name: "الشعاب المرجانية", desc: "ألوان لا تنتهي", sky: "#a8e1f0", water: "#1f9ec4", unlockLevel: 8 },
  { id: "frozen-fjord", name: "المضيق المتجمد", desc: "صيد عبر الجليد", sky: "#e3eef5", water: "#6c9cb8", unlockLevel: 11 },
  { id: "bamboo-pond", name: "بركة الخيزران", desc: "سكون الشرق", sky: "#dfe9c6", water: "#5c9a6a", unlockLevel: 14 },
  { id: "volcano-lagoon", name: "بحيرة البركان", desc: "مياه دافئة وأسماك نارية", sky: "#f2b9a0", water: "#a8513d", unlockLevel: 18 },
  { id: "swamp", name: "المستنقع الغامض", desc: "ظلال وأسرار", sky: "#b9c4a2", water: "#4f5e3a", unlockLevel: 22 },
  { id: "deep-ocean", name: "أعماق المحيط", desc: "عمالقة الظلام", sky: "#8fb3cf", water: "#173f66", unlockLevel: 27 },
  { id: "sky-isles", name: "جزر السماء", desc: "بحيرات معلّقة بين الغيوم", sky: "#d9d4f2", water: "#6fa8d6", unlockLevel: 33 },
];

export const BAITS: BaitDef[] = [
  { id: "worm", name: "دودة عادية", desc: "طُعم أساسي", boost: 0, color: "#c9826b" },
  { id: "shrimp", name: "روبيان طازج", desc: "يجذب الأسماك النادرة", boost: 1, color: "#f08a5d" },
  { id: "golden", name: "طُعم ذهبي", desc: "فرصة أعلى للأسطوري", boost: 2, color: "#e8b730" },
];
