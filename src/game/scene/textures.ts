import * as THREE from "three";

export function canvasTex(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, repeat = 1, srgb = true) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  draw(cv.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; return t;
}

/** Tileable water normal map from summed sine waves. */
export function waterNormals() {
  const s = 256; const h = new Float32Array(s * s);
  const waves = Array.from({ length: 10 }, () => ({ kx: Math.round(Math.random() * 8 - 4) || 1, ky: Math.round(Math.random() * 8 - 4) || 2, p: Math.random() * 6.28, a: Math.random() }));
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    let v = 0; for (const w of waves) v += w.a * Math.sin(((x * w.kx + y * w.ky) / s) * Math.PI * 2 + w.p);
    h[y * s + x] = v;
  }
  const cv = document.createElement("canvas"); cv.width = cv.height = s; const c = cv.getContext("2d")!; const img = c.createImageData(s, s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = h[y * s + ((x + 1) % s)]! - h[y * s + ((x - 1 + s) % s)]!;
    const dy = h[((y + 1) % s) * s + x]! - h[((y - 1 + s) % s) * s + x]!;
    const n = new THREE.Vector3(-dx * 0.6, -dy * 0.6, 1).normalize(); const i = (y * s + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export const softDot = () => canvasTex(64, (c, s) => {
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(255,255,255,.6)"); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});

export const rayTex = () => canvasTex(128, (c, s) => {
  const g = c.createLinearGradient(0, 0, 0, s); g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.fillRect(0, 0, s, s);
  const e = c.createLinearGradient(0, 0, s, 0); e.addColorStop(0, "rgba(0,0,0,1)"); e.addColorStop(0.5, "rgba(0,0,0,0)"); e.addColorStop(1, "rgba(0,0,0,1)");
  c.globalCompositeOperation = "destination-out"; c.fillStyle = e; c.fillRect(0, 0, s, s);
});

export const cloudTex = () => canvasTex(256, (c, s) => {
  for (let i = 0; i < 14; i++) {
    const x = s * (0.2 + Math.random() * 0.6), y = s * (0.45 + Math.random() * 0.15), r = s * (0.1 + Math.random() * 0.14);
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g; c.fillRect(0, 0, s, s);
  }
});

export const groundTex = (base: string) => canvasTex(256, (c, s) => {
  c.fillStyle = base; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 3000; i++) { c.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * 0.12})`; c.fillRect(Math.random() * s, Math.random() * s, 2, 3); }
}, 12);

export const woodTex = () => canvasTex(256, (c, s) => {
  c.fillStyle = "#8a5a34"; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(${Math.random() > 0.5 ? "60,30,10" : "190,130,80"},${0.15 + Math.random() * 0.25})`; c.lineWidth = 1 + Math.random() * 2; const y = Math.random() * s; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(s * 0.3, y + 4, s * 0.6, y - 4, s, y); c.stroke(); }
});
