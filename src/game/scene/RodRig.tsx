import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CAST_TIME, castTarget, now, type Live, type Phase } from "../live";
import { Fish3D } from "./Fish";
import { emitSplash } from "./Splashes";

const SEGS = 4;
const SEG_LEN = 0.68;
const TIP = new THREE.Vector3();
const V = new THREE.Vector3();
const lerp = THREE.MathUtils.lerp;
const damp = (cur: number, to: number, k: number, d: number) => cur + (to - cur) * (1 - Math.exp(-k * d));

export function RodRig({ live, fishColor, fishSize }: { live: Live; fishColor: string; fishSize: number }) {
  const base = useRef<THREE.Group>(null);
  const segs = useRef<(THREE.Group | null)[]>([]);
  const tip = useRef<THREE.Object3D>(null);
  const reel = useRef<THREE.Group>(null);
  const bobber = useRef<THREE.Group>(null);
  const hooked = useRef<THREE.Group>(null);
  const st = useRef({ phase: "idle" as Phase, pitch: 0.35, bend: 0, yaw: 0, landed: false, bit: false, lastSplash: 0, fishX: 0, fishZ: 0, exitX: 0, exitZ: 0, lostFrom: new THREE.Vector3() });
  const { camera } = useThree();
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9 })); l.frustumCulled = false; return l;
  }, []);

  useFrame(({ clock }, dRaw) => {
    const d = Math.min(dRaw, 0.05); const t = clock.elapsedTime; const s = st.current;
    if (!base.current || !tip.current || !bobber.current || !hooked.current) return;
    const phase = live.phase; const pt = now() - live.phaseAt;
    if (phase !== s.phase) { // phase entry
      if (phase === "casting") s.landed = false;
      if (phase === "bite") s.bit = false;
      if (phase === "caught") { s.exitX = s.fishX; s.exitZ = s.fishZ; emitSplash(s.fishX, 0, s.fishZ, 1.6); }
      if (phase === "lost") s.lostFrom.copy(bobber.current.position);
      s.phase = phase;
    }
    const target = castTarget(live.castPower);

    // ---- rod pose ----
    let pitch = 0.35 + Math.sin(t * 1.3) * 0.015, bend = 0, yaw = 0, k = 6;
    if (phase === "charging") { pitch = 0.4 + live.power * 1.1; bend = 0.1 * live.power; yaw = -0.15 * live.power; k = 10; }
    else if (phase === "casting") {
      if (pt < 0.18) { pitch = lerp(0.4 + live.castPower * 1.1, -0.15, pt / 0.18); bend = 0.35; k = 40; }
      else { pitch = 0.25; bend = -0.15 * Math.exp(-(pt - 0.18) * 4) * Math.cos(pt * 25); k = 8; }
    } else if (phase === "waiting") { const nib = now() - live.nibbleAt; pitch = 0.3; bend = nib < 0.3 ? -0.18 : 0; }
    else if (phase === "bite") { pitch = 0.25; bend = -0.45 + Math.sin(t * 40) * 0.08; k = 20; }
    else if (phase === "reeling") { pitch = 0.6 + live.tension * 0.35; bend = -(0.25 + live.tension * 1.05) + Math.sin(t * 35) * 0.03 * live.tension; yaw = THREE.MathUtils.clamp(s.fishX * 0.06, -0.3, 0.3); k = 12; }
    else if (phase === "caught") { pitch = 1.05; bend = -0.35 * Math.max(0, 1 - pt); k = 8; }
    else if (phase === "lost") { pitch = 0.3; bend = 0.25 * Math.exp(-pt * 3) * Math.cos(pt * 20); k = 20; }
    s.pitch = damp(s.pitch, pitch, k, d); s.bend = damp(s.bend, bend, k, d); s.yaw = damp(s.yaw, yaw, 6, d);
    base.current.rotation.set(s.pitch, s.yaw, 0);
    segs.current.forEach((g, i) => { if (g) g.rotation.x = (s.bend / SEGS) * (0.6 + i * 0.35); });
    if (reel.current && phase === "reeling" && live.holding) reel.current.rotation.x += d * 18;
    tip.current.getWorldPosition(TIP);

    // ---- bobber / hooked fish ----
    const b = bobber.current.position; const h = hooked.current; h.visible = false; bobber.current.visible = true;
    if (phase === "idle" || phase === "charging") b.set(TIP.x, TIP.y - 0.75 + Math.sin(t * 2) * 0.03, TIP.z);
    else if (phase === "casting") {
      const kk = THREE.MathUtils.clamp((pt - 0.15) / (CAST_TIME - 0.15), 0, 1);
      b.set(lerp(TIP.x, target.x, kk), lerp(TIP.y, 0.03, kk) + Math.sin(kk * Math.PI) * (1.5 + live.castPower * 2.5), lerp(TIP.z, target.z, kk));
      if (kk >= 1 && !s.landed) { s.landed = true; emitSplash(target.x, 0, target.z, 0.8); }
    } else if (phase === "waiting") {
      const nib = now() - live.nibbleAt;
      b.set(target.x, 0.04 + Math.sin(t * 2.2) * 0.03 - (nib < 0.35 ? 0.08 : 0), target.z);
    } else if (phase === "bite") {
      if (!s.bit) { s.bit = true; emitSplash(target.x, 0, target.z, 0.6); }
      b.set(target.x + Math.sin(t * 30) * 0.06, -0.15 + Math.sin(t * 16) * 0.06, target.z);
      s.fishX = target.x; s.fishZ = target.z;
    } else if (phase === "reeling") {
      const p = live.progress;
      s.fishX = lerp(target.x, 0, p) + Math.sin(t * 1.7) * 1.6 * (1 - p * 0.7);
      s.fishZ = lerp(target.z, 1.2, p);
      b.set(s.fishX, 0.02, s.fishZ + 0.3);
      h.visible = true; h.position.set(s.fishX, -0.08 + Math.sin(t * 9) * 0.05, s.fishZ);
      h.rotation.set(Math.sin(t * 12) * 0.3, Math.atan2(-Math.cos(t * 1.7), 1) + Math.PI / 2, 0);
      if (t - s.lastSplash > (live.tension > 0.6 ? 0.25 : 0.7)) { s.lastSplash = t; emitSplash(s.fishX, 0, s.fishZ, 0.35 + live.tension * 0.5); }
    } else if (phase === "caught") {
      bobber.current.visible = false; h.visible = true;
      const kk = Math.min(pt / 0.9, 1); const e = 1 - Math.pow(1 - kk, 3);
      h.position.set(lerp(s.exitX, 0, e), lerp(0, 1.9, e) + Math.sin(kk * Math.PI) * 1.4, lerp(s.exitZ, 3.6, e));
      h.rotation.set(0, Math.PI / 2 + kk * Math.PI * 2, Math.sin(t * 18) * 0.5 * (1 - kk));
    } else if (phase === "lost") {
      const kk = Math.min(pt / 0.6, 1);
      b.set(lerp(s.lostFrom.x, TIP.x, kk), lerp(s.lostFrom.y, TIP.y - 0.75, kk) + Math.sin(kk * Math.PI) * 1.2, lerp(s.lostFrom.z, TIP.z, kk));
    }

    // ---- line (quadratic curve with sag) ----
    const end = phase === "caught" ? V.copy(h.position).add(new THREE.Vector3(0, 0.05, 0)) : V.copy(b).add(new THREE.Vector3(0, 0.1, 0));
    const sag = phase === "waiting" ? 0.7 : phase === "reeling" ? 0.25 * (1 - live.tension) : phase === "casting" ? 0.3 : phase === "lost" ? 0.8 : 0.08;
    const pos = line.geometry.attributes["position"] as THREE.BufferAttribute;
    const cx = (TIP.x + end.x) / 2, cy = (TIP.y + end.y) / 2 - sag, cz = (TIP.z + end.z) / 2;
    for (let i = 0; i < 24; i++) {
      const u = i / 23, a = (1 - u) * (1 - u), bb = 2 * (1 - u) * u, c = u * u;
      pos.setXYZ(i, a * TIP.x + bb * cx + c * end.x, a * TIP.y + bb * cy + c * end.y, a * TIP.z + bb * cz + c * end.z);
    }
    pos.needsUpdate = true;

    // ---- camera ----
    const shake = phase === "reeling" ? live.tension * 0.035 : phase === "bite" ? 0.02 : 0;
    const zc = phase === "caught" ? 4.9 : phase === "reeling" ? 5.1 : 5.5;
    camera.position.set(Math.sin(t * 0.3) * 0.08 + (Math.random() - 0.5) * shake, 2.3 + Math.sin(t * 0.5) * 0.04 + (Math.random() - 0.5) * shake, damp(camera.position.z, zc, 2, d));
    camera.lookAt(0, phase === "caught" ? 1.2 : 0.3, -5);
  });

  return <>
    <group ref={base} position={[0.6, 1.15, 3.7]}>
      {/* handle + reel */}
      <mesh position={[0, 0, 0.25]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.04, 0.045, 0.55, 12]} /><meshStandardMaterial color="#1a1a1a" roughness={0.9} /></mesh>
      <mesh position={[0, 0, -0.05]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.05, 0.04, 0.12, 12]} /><meshStandardMaterial color="#e8b030" metalness={0.9} roughness={0.2} /></mesh>
      <group position={[0, -0.12, 0.08]}>
        <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.09, 0.09, 0.08, 20]} /><meshStandardMaterial color="#2a5ad8" metalness={0.7} roughness={0.25} /></mesh>
        <mesh rotation-z={Math.PI / 2}><torusGeometry args={[0.09, 0.012, 8, 24]} /><meshStandardMaterial color="#f0c040" metalness={0.9} roughness={0.2} /></mesh>
        <group ref={reel} position={[0.07, 0, 0]}>
          <mesh position={[0.02, 0.05, 0]}><boxGeometry args={[0.015, 0.12, 0.015]} /><meshStandardMaterial color="#d0d0d0" metalness={0.9} /></mesh>
          <mesh position={[0.04, 0.11, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.05, 8]} /><meshStandardMaterial color="#111" /></mesh>
        </group>
      </group>
      {/* bending blank */}
      <group position={[0, 0, -0.1]}>
        <Seg i={0} refs={segs} tipRef={tip} />
      </group>
    </group>
    <primitive object={line} />
    <group ref={bobber}>
      <mesh position={[0, 0.06, 0]}><sphereGeometry args={[0.08, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e8302a" roughness={0.3} /></mesh>
      <mesh position={[0, 0.06, 0]} rotation-x={Math.PI}><sphereGeometry args={[0.08, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#fafafa" roughness={0.3} /></mesh>
      <mesh position={[0, 0.17, 0]}><cylinderGeometry args={[0.012, 0.012, 0.12, 6]} /><meshStandardMaterial color="#ffd23a" emissive="#ffb000" emissiveIntensity={0.6} /></mesh>
    </group>
    <group ref={hooked} visible={false}><Fish3D color={fishColor} length={0.75 * fishSize} wiggle={24} /></group>
  </>;
}

function Seg({ i, refs, tipRef }: { i: number; refs: React.MutableRefObject<(THREE.Group | null)[]>; tipRef: React.RefObject<THREE.Object3D | null> }) {
  const r0 = 0.03 * (1 - i / SEGS) + 0.006, r1 = 0.03 * (1 - (i + 1) / SEGS) + 0.006;
  return (
    <group ref={(el) => { refs.current[i] = el; }}>
      <mesh position={[0, 0, -SEG_LEN / 2]} rotation-x={Math.PI / 2}><cylinderGeometry args={[r1, r0, SEG_LEN, 10]} /><meshStandardMaterial color={i % 2 ? "#1f4fb8" : "#2a5ad8"} metalness={0.5} roughness={0.25} /></mesh>
      <mesh position={[0, -r0 - 0.015, -SEG_LEN + 0.02]} rotation-x={Math.PI / 2}><torusGeometry args={[0.018, 0.004, 6, 12]} /><meshStandardMaterial color="#f0c040" metalness={0.9} roughness={0.2} /></mesh>
      <group position={[0, 0, -SEG_LEN]}>
        {i < SEGS - 1 ? <Seg i={i + 1} refs={refs} tipRef={tipRef} /> : <object3D ref={tipRef} />}
      </group>
    </group>
  );
}
