import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { FishModel } from "./FishModel";
import { GREEN_LAKE_FISH, type FishDef } from "./data";

export type Phase = "idle" | "casting" | "waiting" | "bite" | "reeling" | "caught";

const CAST_TIME = 0.9;
const TIP = new THREE.Vector3();
const TARGET = new THREE.Vector3(0, 0, -7);

function makeTexture(draw: (c: CanvasRenderingContext2D, s: number) => void, repeat = 1) {
  const s = 256; const cv = document.createElement("canvas"); cv.width = cv.height = s;
  draw(cv.getContext("2d")!, s);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace; return t;
}

function Water() {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(60, 60, 60, 60); g.rotateX(-Math.PI / 2); return g; }, []);
  const base = useMemo(() => Float32Array.from(geo.attributes["position"]!.array), [geo]);
  const tex = useMemo(() => makeTexture((c, s) => {
    c.fillStyle = "#2f8f83"; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 140; i++) { c.strokeStyle = `rgba(220,255,245,${Math.random() * 0.18})`; c.lineWidth = 1 + Math.random() * 2; const x = Math.random() * s, y = Math.random() * s; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 10, y - 4, x + 24, y); c.stroke(); }
  }, 8), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime; const p = geo.attributes["position"]!;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3]!, z = base[i * 3 + 2]!;
      p.setY(i, Math.sin(x * 0.5 + t * 1.2) * 0.06 + Math.cos(z * 0.6 + t) * 0.06);
    }
    p.needsUpdate = true; geo.computeVertexNormals();
    tex.offset.set(t * 0.01, t * 0.006);
  });
  return (
    <mesh ref={ref} geometry={geo} receiveShadow>
      <meshPhysicalMaterial map={tex} transparent opacity={0.72} roughness={0.12} metalness={0.1} clearcoat={1} />
    </mesh>
  );
}

function Shore() {
  const grass = useMemo(() => makeTexture((c, s) => {
    c.fillStyle = "#5f8f3e"; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 2500; i++) { c.fillStyle = `hsl(${85 + Math.random() * 30},45%,${25 + Math.random() * 25}%)`; c.fillRect(Math.random() * s, Math.random() * s, 2, 3); }
  }, 10), []);
  const trees = useMemo(() => Array.from({ length: 70 }, (_, i) => {
    const a = (i / 70) * Math.PI * 2 + Math.random() * 0.1; const r = 19 + Math.random() * 9;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r - 6, s: 0.8 + Math.random() * 1.2, h: 110 + Math.random() * 30 };
  }).filter((t) => t.z < 4), []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -1.2, 0]}><planeGeometry args={[80, 80]} /><meshStandardMaterial color="#1f4a44" /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, -6]} receiveShadow>
        <ringGeometry args={[17, 45, 64]} /><meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 0.6, 0]} castShadow><cylinderGeometry args={[0.12, 0.18, 1.2, 6]} /><meshStandardMaterial color="#6b4a2f" /></mesh>
          <mesh position={[0, 2, 0]} castShadow><coneGeometry args={[0.9, 2.2, 7]} /><meshStandardMaterial color={`hsl(${t.h},40%,24%)`} flatShading /></mesh>
          <mesh position={[0, 3, 0]} castShadow><coneGeometry args={[0.65, 1.6, 7]} /><meshStandardMaterial color={`hsl(${t.h},42%,30%)`} flatShading /></mesh>
        </group>
      ))}
      {[[-6, -10], [7, -12], [-3, -4], [5, -5], [2, -14]].map(([x, z], i) => (
        <mesh key={i} position={[x!, 0.04, z!]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.45, 12, 0.3, Math.PI * 1.8]} /><meshStandardMaterial color="#4f8a3c" side={THREE.DoubleSide} /></mesh>
      ))}
      {[[-9, -17, 1.6], [10, -16, 1.2], [-14, -8, 1]].map(([x, z, s], i) => (
        <mesh key={i} position={[x!, 0.2, z!]} scale={s!} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#7d8580" flatShading /></mesh>
      ))}
      {/* dock */}
      <group position={[0, 0.25, 3.2]}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[0, 0, -i * 0.42]} castShadow receiveShadow><boxGeometry args={[2.2, 0.1, 0.38]} /><meshStandardMaterial color={i % 2 ? "#8a6240" : "#7a5536"} roughness={0.9} /></mesh>
        ))}
        {[[-1, -2.6], [1, -2.6], [-1, 0], [1, 0]].map(([x, z], i) => (
          <mesh key={i} position={[x!, -0.4, z!]}><cylinderGeometry args={[0.09, 0.09, 1, 6]} /><meshStandardMaterial color="#5a3d26" /></mesh>
        ))}
      </group>
    </group>
  );
}

function SwimmingFish() {
  const school = useMemo(() => Array.from({ length: 9 }, (_, i) => ({
    fish: GREEN_LAKE_FISH[i % GREEN_LAKE_FISH.length]!, r: 2 + Math.random() * 6, speed: 0.15 + Math.random() * 0.25,
    off: Math.random() * Math.PI * 2, depth: -0.35 - Math.random() * 0.6, cz: -7 + Math.random() * 3, dir: Math.random() > 0.5 ? 1 : -1,
  })), []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    school.forEach((f, i) => {
      const g = refs.current[i]; if (!g) return;
      const a = f.off + t * f.speed * f.dir;
      g.position.set(Math.cos(a) * f.r, f.depth + Math.sin(t + i) * 0.05, f.cz + Math.sin(a) * f.r * 0.6);
      g.rotation.y = -a + (f.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
    });
  });
  return <>{school.map((f, i) => (
    <group key={i} ref={(el) => { refs.current[i] = el; }}><FishModel color={f.fish.color} belly={f.fish.belly} scale={f.fish.size * 0.7} /></group>
  ))}</>;
}

/** Rod, line, bobber and hooked fish, all driven by phase + time since phase start. */
function RodRig({ phase, caught }: { phase: Phase; caught: FishDef | null }) {
  const rod = useRef<THREE.Group>(null);
  const tip = useRef<THREE.Object3D>(null);
  const bobber = useRef<THREE.Group>(null);
  const hooked = useRef<THREE.Group>(null);
  const ripple = useRef<THREE.Mesh>(null);
  const start = useRef(0);
  const { clock } = useThree();
  useEffect(() => { start.current = clock.elapsedTime; }, [phase, clock]);
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(20 * 3), 3));
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#f5f5f0", transparent: true, opacity: 0.85 }));
  }, []);

  useFrame(() => {
    const t = clock.elapsedTime; const pt = t - start.current;
    if (!rod.current || !tip.current || !bobber.current) return;
    // rod pitch
    let pitch = -0.35;
    if (phase === "casting") { const k = Math.min(pt / CAST_TIME, 1); pitch = k < 0.4 ? -0.35 - (k / 0.4) * 0.9 : -1.25 + ((k - 0.4) / 0.6) * 1.6; }
    else if (phase === "waiting") pitch = 0.25 + Math.sin(t * 1.5) * 0.02;
    else if (phase === "bite") pitch = 0.35 + Math.sin(t * 30) * 0.06;
    else if (phase === "reeling") pitch = -0.2 + Math.sin(t * 18) * 0.08;
    else if (phase === "caught") pitch = -0.9;
    rod.current.rotation.x += (pitch - rod.current.rotation.x) * (phase === "casting" ? 0.5 : 0.15);
    rod.current.rotation.z = phase === "reeling" ? Math.sin(t * 12) * 0.05 : 0;
    tip.current.getWorldPosition(TIP);

    // bobber
    const b = bobber.current.position; let visible = true;
    if (phase === "idle") { b.set(TIP.x, TIP.y - 0.9, TIP.z); }
    else if (phase === "casting") {
      const k = Math.min(Math.max((pt - CAST_TIME * 0.45) / (CAST_TIME * 0.7), 0), 1);
      if (k === 0) b.set(TIP.x, TIP.y - 0.4, TIP.z);
      else b.set(THREE.MathUtils.lerp(TIP.x, TARGET.x, k), THREE.MathUtils.lerp(TIP.y, 0, k) + Math.sin(k * Math.PI) * 3, THREE.MathUtils.lerp(TIP.z, TARGET.z, k));
    } else if (phase === "waiting") b.set(TARGET.x, 0.05 + Math.sin(t * 2) * 0.04, TARGET.z);
    else if (phase === "bite") b.set(TARGET.x + Math.sin(t * 25) * 0.05, -0.12 + Math.sin(t * 14) * 0.1, TARGET.z);
    else if (phase === "reeling") { b.set(TARGET.x + Math.sin(t * 6) * 0.6, -0.15, TARGET.z + Math.min(pt * 0.4, 4)); }
    else visible = false;
    bobber.current.visible = visible;

    // hooked fish
    if (hooked.current) {
      const h = hooked.current;
      if (phase === "reeling") { h.visible = true; h.position.set(b.x, -0.45, b.z); h.rotation.set(0, Math.sin(t * 8) * 0.8 + Math.PI / 2, 0); }
      else if (phase === "caught") {
        h.visible = true; const k = Math.min(pt / 0.8, 1);
        h.position.set(THREE.MathUtils.lerp(0, TIP.x, k), THREE.MathUtils.lerp(-0.4, TIP.y - 0.6, k) + Math.sin(k * Math.PI) * 1.2, THREE.MathUtils.lerp(-4, TIP.z, k));
        h.rotation.set(0, Math.PI / 2, Math.PI / 2 + Math.sin(t * 20) * 0.4);
      } else h.visible = false;
    }
    if (ripple.current) {
      const show = phase === "waiting" || phase === "bite" || phase === "reeling";
      ripple.current.visible = show; ripple.current.position.set(b.x, 0.08, b.z);
      const s = 1 + ((t * (phase === "bite" ? 2.5 : 0.8)) % 1) * 2; ripple.current.scale.setScalar(s);
      (ripple.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - (s - 1) / 2);
    }
    // line
    const pos = line.geometry.attributes["position"] as THREE.BufferAttribute;
    const end = phase === "caught" && hooked.current ? hooked.current.position : b;
    const sag = phase === "waiting" ? 0.6 : phase === "idle" ? 0 : 0.15;
    for (let i = 0; i < 20; i++) { const k = i / 19; pos.setXYZ(i, THREE.MathUtils.lerp(TIP.x, end.x, k), THREE.MathUtils.lerp(TIP.y, end.y, k) - Math.sin(k * Math.PI) * sag, THREE.MathUtils.lerp(TIP.z, end.z, k)); }
    pos.needsUpdate = true; line.geometry.computeBoundingSphere();
  });

  return (
    <>
      <group ref={rod} position={[0.55, 0.9, 2.2]}>
        <mesh position={[0, 0, 0.1]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.045, 0.05, 0.6, 8]} /><meshStandardMaterial color="#2b1d14" roughness={0.8} /></mesh>
        <mesh position={[0.07, 0, 0.05]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.06, 14]} /><meshStandardMaterial color="#c9a14a" metalness={0.8} roughness={0.25} /></mesh>
        <mesh position={[0, 0, -1.4]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.008, 0.03, 2.6, 8]} /><meshStandardMaterial color="#1d3b33" metalness={0.4} roughness={0.3} /></mesh>
        <object3D ref={tip} position={[0, 0, -2.7]} />
      </group>
      <primitive object={line} />
      <group ref={bobber}>
        <mesh position={[0, 0.06, 0]}><sphereGeometry args={[0.08, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e23d2e" roughness={0.3} /></mesh>
        <mesh position={[0, 0.06, 0]} rotation-x={Math.PI}><sphereGeometry args={[0.08, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#fafafa" /></mesh>
      </group>
      <mesh ref={ripple} rotation-x={-Math.PI / 2}><ringGeometry args={[0.15, 0.2, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.5} /></mesh>
      <group ref={hooked} visible={false}>{caught && <FishModel color={caught.color} belly={caught.belly} scale={caught.size * 0.9} wiggle={22} />}</group>
    </>
  );
}

function Ready({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => { if (!done.current) { done.current = true; onReady(); } });
  return null;
}

export function LakeScene({ phase, caught, onReady }: { phase: Phase; caught: FishDef | null; onReady: () => void }) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 2.4, 5.2], fov: 55 }} onCreated={({ camera }) => camera.lookAt(0, 0.2, -5)}>
      <color attach="background" args={["#bfe3d9"]} />
      <fog attach="fog" args={["#bfe3d9", 14, 42]} />
      <hemisphereLight args={["#fff6df", "#2f5a3a", 0.8]} />
      <directionalLight position={[6, 10, 4]} intensity={2.2} color="#fff1d0" castShadow shadow-mapSize={[1024, 1024]} />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={1} color="#bfe" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
      </Environment>
      <mesh position={[8, 9, -30]}><sphereGeometry args={[2, 24, 16]} /><meshBasicMaterial color="#fff4d6" /></mesh>
      <Shore />
      <SwimmingFish />
      <Water />
      <RodRig phase={phase} caught={caught} />
      <Ready onReady={onReady} />
    </Canvas>
  );
}

export function FishPreview({ fish }: { fish: FishDef }) {
  function Spin() {
    const g = useRef<THREE.Group>(null);
    useFrame((_, d) => { if (g.current) g.current.rotation.y += d * 0.8; });
    return <group ref={g}><FishModel color={fish.color} belly={fish.belly} scale={2.2 / Math.max(fish.size, 1)} wiggle={6} /></group>;
  }
  return (
    <Canvas camera={{ position: [0, 0.3, 2.4], fov: 40 }} gl={{ alpha: true }}>
      <ambientLight intensity={0.8} /><directionalLight position={[2, 3, 2]} intensity={2} />
      <Environment resolution={32}><Lightformer intensity={2} position={[0, 3, 2]} scale={[5, 5, 1]} /></Environment>
      <Spin />
    </Canvas>
  );
}
