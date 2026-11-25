import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { softDot } from "./textures";

const N = 260;
const queue: { x: number; y: number; z: number; s: number }[] = [];
/** Imperative: spray water droplets + a ripple at a point. */
export const emitSplash = (x: number, y: number, z: number, s = 1) => { queue.push({ x, y, z, s }); };

export function Splashes() {
  const tex = useMemo(softDot, []);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3).fill(-99), 3)); return g; }, []);
  const vel = useMemo(() => new Float32Array(N * 3), []);
  const life = useMemo(() => new Float32Array(N), []);
  const cursor = useRef(0);
  const rings = useRef<THREE.Group>(null);
  const ringLife = useRef<number[]>([0, 0, 0, 0, 0, 0]);
  const ringIdx = useRef(0);

  useFrame((_, dRaw) => {
    const d = Math.min(dRaw, 0.05); const p = geo.attributes["position"] as THREE.BufferAttribute;
    while (queue.length) {
      const e = queue.shift()!; const count = Math.round(30 * e.s);
      for (let k = 0; k < count; k++) {
        const i = cursor.current; cursor.current = (i + 1) % N;
        const a = Math.random() * Math.PI * 2, sp = (0.5 + Math.random() * 1.5) * e.s;
        p.setXYZ(i, e.x, e.y, e.z); vel[i * 3] = Math.cos(a) * sp; vel[i * 3 + 1] = (2 + Math.random() * 3) * e.s; vel[i * 3 + 2] = Math.sin(a) * sp; life[i] = 1;
      }
      const r = rings.current?.children[ringIdx.current]; if (r) { r.position.set(e.x, 0.07, e.z); ringLife.current[ringIdx.current] = e.s; }
      ringIdx.current = (ringIdx.current + 1) % 6;
    }
    for (let i = 0; i < N; i++) {
      if (life[i]! <= 0) continue;
      life[i]! -= d * 1.2; vel[i * 3 + 1]! -= 9.8 * d;
      const y = p.getY(i) + vel[i * 3 + 1]! * d;
      if (y < 0 || life[i]! <= 0) { p.setXYZ(i, 0, -99, 0); life[i] = 0; continue; }
      p.setXYZ(i, p.getX(i) + vel[i * 3]! * d, y, p.getZ(i) + vel[i * 3 + 2]! * d);
    }
    p.needsUpdate = true;
    rings.current?.children.forEach((m, i) => {
      const l = ringLife.current[i]!; const mesh = m as THREE.Mesh; const mat = mesh.material as THREE.MeshBasicMaterial;
      if (l <= 0) { mesh.visible = false; return; }
      mesh.visible = true; ringLife.current[i] = l - d * 0.8; const k = 1 - ringLife.current[i]!;
      mesh.scale.setScalar(0.3 + k * 4); mat.opacity = Math.max(0, ringLife.current[i]!) * 0.8;
    });
  });
  return <>
    <points geometry={geo} frustumCulled={false}><pointsMaterial map={tex} size={0.14} color="#eaffff" transparent depthWrite={false} /></points>
    <group ref={rings}>{Array.from({ length: 6 }, (_, i) => (
      <mesh key={i} rotation-x={-Math.PI / 2} visible={false}><ringGeometry args={[0.35, 0.42, 40]} /><meshBasicMaterial color="#ffffff" transparent depthWrite={false} /></mesh>
    ))}</group>
  </>;
}
