// Synthesized sound effects (WebAudio) — no files to load.
let ctx: AudioContext | null = null;
let muted = false;
export const setMuted = (m: boolean) => { muted = m; };
function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) { const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; ctx = new C(); }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
function noise(c: AudioContext, dur: number) {
  const b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate); const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = b; return s;
}
function env(c: AudioContext, g: GainNode, peak: number, a: number, d: number, t0 = c.currentTime) {
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}
function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.2, delay = 0, slideTo?: number) {
  const c = ac(); if (!c || muted) return;
  const o = c.createOscillator(); const g = c.createGain(); const t0 = c.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  o.connect(g).connect(c.destination); env(c, g, vol, 0.01, dur, t0); o.start(t0); o.stop(t0 + dur + 0.05);
}
function hiss(dur: number, f0: number, f1: number, vol = 0.3, delay = 0, type: BiquadFilterType = "bandpass") {
  const c = ac(); if (!c || muted) return;
  const s = noise(c, dur + 0.1); const f = c.createBiquadFilter(); const g = c.createGain(); const t0 = c.currentTime + delay;
  f.type = type; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur); f.Q.value = 1.2;
  s.connect(f).connect(g).connect(c.destination); env(c, g, vol, 0.02, dur, t0); s.start(t0);
}
export const sfx = {
  unlock: () => { ac(); },
  charge: (p: number) => tone(200 + p * 500, 0.06, "triangle", 0.05),
  cast: () => { hiss(0.45, 400, 3000, 0.25); },
  splash: () => { hiss(0.5, 1800, 300, 0.4, 0, "lowpass"); tone(500, 0.15, "sine", 0.1, 0, 180); },
  nibble: () => tone(320, 0.08, "sine", 0.12, 0, 200),
  bite: () => { tone(700, 0.1, "square", 0.12); tone(900, 0.12, "square", 0.12, 0.1); hiss(0.25, 1500, 400, 0.3, 0, "lowpass"); },
  reel: () => tone(1400 + Math.random() * 300, 0.025, "square", 0.04),
  strain: () => tone(90, 0.12, "sawtooth", 0.06),
  snap: () => { tone(1200, 0.25, "sawtooth", 0.15, 0, 80); hiss(0.2, 4000, 800, 0.3); },
  escape: () => { tone(400, 0.3, "triangle", 0.15, 0, 150); },
  catch: () => { hiss(0.6, 2500, 300, 0.45, 0, "lowpass"); [523, 659, 784].forEach((f, i) => tone(f, 0.18, "triangle", 0.15, i * 0.08)); },
  reveal: (rare: boolean) => {
    const notes = rare ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047];
    notes.forEach((f, i) => { tone(f, 0.35, "triangle", 0.16, i * 0.09); tone(f * 2, 0.3, "sine", 0.05, i * 0.09); });
    hiss(1, 6000, 9000, 0.06, 0.2, "highpass");
  },
  xp: () => [1319, 1568, 2093].forEach((f, i) => tone(f, 0.12, "sine", 0.1, i * 0.06)),
  shake: () => { tone(120, 0.08, "square", 0.08); hiss(0.08, 800, 400, 0.15); },
  chestOpen: () => { tone(80, 0.6, "sine", 0.4, 0, 40); hiss(0.8, 300, 6000, 0.3); [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.4, "triangle", 0.12, 0.15 + i * 0.07)); },
  card: () => tone(880, 0.1, "triangle", 0.1, 0, 1320),
  tap: () => tone(600, 0.05, "triangle", 0.08),
};
