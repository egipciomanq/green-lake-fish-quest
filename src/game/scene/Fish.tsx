import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import fishModel from "@/assets/models/barramundi.glb.asset.json";
import type { FishDef } from "../data";
import { emitSplash } from "./Splashes";

useGLTF.preload(fishModel.url);
const LEN = 0.64; // model length along Z

/** CC0 Barramundi (Khronos sample, Microsoft) tinted per species; head points +X after this wrapper. */
export function Fish3D({ color, length = 0.6, wiggle = 7 }: { color: string; length?: number; wiggle?: number }) {
  const { scene } = useGLTF(fishModel.url);
  const obj = useMemo(() => {
    const c = clone(scene);
    const tint = new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.25);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { const mat = (m.material as THREE.MeshStandardMaterial).clone(); mat.color = tint; mat.roughness = 0.35; m.material = mat; m.castShadow = true; }
    });
    return c;
  }, [scene, color]);
  const body = useRef<THREE.Group>(null);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => { if (body.current) body.current.rotation.y = Math.PI / 2 + Math.sin(clock.elapsedTime * wiggle + seed) * 0.18; });
  const s = length / LEN;
  return <group scale={s}><group ref={body}><primitive object={obj} position={[0, -0.14, 0]} /></group></group>;
}

/** School swimming under the surface + an occasional jumper. */
export function School({ fish }: { fish: FishDef[] }) {
  const list = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    f: fish[i % fish.length]!, r: 2 + Math.random() * 6, speed: 0.12 + Math.random() * 0.2, off: Math.random() * 6.28,
    depth: -0.22 - Math.random() * 0.35, cz: -7 + Math.random() * 3, dir: Math.random() > 0.5 ? 1 : -1,
  })), [fish]);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    list.forEach((f, i) => {
      const g = refs.current[i]; if (!g) return;
      const a = f.off + t * f.speed * f.dir;
      g.position.set(Math.cos(a) * f.r, f.depth + Math.sin(t * 0.8 + i) * 0.06, f.cz + Math.sin(a) * f.r * 0.6);
      g.rotation.y = Math.atan2(-Math.cos(a) * f.dir * 0.6, -Math.sin(a) * f.dir);
    });
  });
  return <>
    {list.map((f, i) => <group key={i} ref={(el) => { refs.current[i] = el; }}><Fish3D color={f.f.color} length={0.45 * f.f.size} /></group>)}
    <Jumper fish={fish} />
  </>;
}

function Jumper({ fish }: { fish: FishDef[] }) {
  const g = useRef<THREE.Group>(null);
  const st = useRef({ next: 4, t: -1, x: 0, z: -8, dir: 1, f: fish[0]! });
  useLayoutEffect(() => { if (g.current) g.current.visible = false; }, []);
  useFrame(({ clock }, d) => {
    const s = st.current; const el = clock.elapsedTime; if (!g.current) return;
    if (s.t < 0 && el > s.next) { s.t = 0; s.x = (Math.random() - 0.5) * 12; s.z = -6 - Math.random() * 8; s.dir = Math.random() > 0.5 ? 1 : -1; s.f = fish[Math.floor(Math.random() * fish.length)]!; emitSplash(s.x, 0, s.z, 0.7); }
    if (s.t >= 0) {
      s.t += Math.min(d, 0.05) / 1.1; const k = s.t;
      g.current.visible = true;
      g.current.position.set(s.x + (k - 0.5) * 2.4 * s.dir, Math.sin(k * Math.PI) * 1.6 - 0.2, s.z);
      g.current.rotation.set(0, s.dir > 0 ? 0 : Math.PI, (0.5 - k) * 2.4);
      if (k >= 1) { emitSplash(g.current.position.x, 0, s.z, 0.9); s.t = -1; s.next = el + 6 + Math.random() * 8; g.current.visible = false; }
    }
  });
  return <group ref={g}><Fish3D color={st.current.f.color} length={0.6} wiggle={18} /></group>;
}
