// Shared mutable state written by the UI and read every frame by the 3D scene (never React state).
export type Phase = "idle" | "charging" | "casting" | "waiting" | "bite" | "reeling" | "caught" | "lost";
export const CAST_TIME = 1.1; // seconds from release to bobber landing
export const now = () => performance.now() / 1000;

export interface Live {
  phase: Phase; phaseAt: number; power: number; castPower: number;
  tension: number; progress: number; holding: boolean; nibbleAt: number;
}
export const createLive = (): Live => ({
  phase: "idle", phaseAt: 0, power: 0, castPower: 0.5, tension: 0, progress: 0, holding: false, nibbleAt: -10,
});
export const castTarget = (power: number) => ({ x: Math.sin(power * 9) * 1.2, z: -1.5 - power * 7 });
