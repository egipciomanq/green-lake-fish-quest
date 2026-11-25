import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import type { WorldTheme } from "../data";
import { cloudTex, groundTex, rayTex, softDot, waterNormals, woodTex } from "./textures";

// Seeded RNG so a world always looks the same.
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

export function SkyDome({ theme }: { theme: WorldTheme }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(theme.skyTop) }, bottom: { value: new THREE.Color(theme.skyBottom) }, sun: { value: new THREE.Color(theme.sun) }, sunDir: { value: new THREE.Vector3(...theme.sunPos).normalize() }, sunAmt: { value: theme.outdoor ? 1 : 0.35 } },
    vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }",
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sun; uniform vec3 sunDir; uniform float sunAmt; varying vec3 vW;
      void main(){ vec3 d = normalize(vW - cameraPosition); float h = clamp(d.y*1.5+0.08,0.,1.); vec3 c = mix(bottom, top, pow(h,0.6));
      float s = max(dot(d, sunDir), 0.); c += sun*(pow(s,900.)*3. + pow(s,12.)*0.45)*sunAmt; gl_FragColor = vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }), [theme]);
  return <mesh material={mat} scale={150}><sphereGeometry args={[1, 32, 16]} /></mesh>;
}

export function WaterSurface({ theme }: { theme: WorldTheme }) {
  const water = useMemo(() => {
    const w = new Water(new THREE.PlaneGeometry(200, 200), {
      textureWidth: 256, textureHeight: 256, waterNormals: waterNormals(),
      sunDirection: new THREE.Vector3(...theme.sunPos).normalize(), sunColor: new THREE.Color(theme.sun),
      waterColor: new THREE.Color(theme.water), distortionScale: 2.2, fog: true, alpha: 0.78,
    });
    w.rotation.x = -Math.PI / 2; w.material.transparent = true;
    w.material.uniforms["size"]!.value = 3;
    return w;
  }, [theme]);
  useFrame((_, d) => { water.material.uniforms["time"]!.value += Math.min(d, 0.05) * 0.6; });
  return <primitive object={water} />;
}

/** Light lake bed so fish read through the water. */
export function LakeBed({ theme }: { theme: WorldTheme }) {
  const tex = useMemo(() => groundTex(new THREE.Color(theme.water).lerp(new THREE.Color("#e8dcb0"), 0.45).getStyle()), [theme]);
  return <mesh rotation-x={-Math.PI / 2} position={[0, -1.1, -6]}><circleGeometry args={[24, 48]} /><meshStandardMaterial map={tex} roughness={1} /></mesh>;
}

export function SunRays({ theme }: { theme: WorldTheme }) {
  const tex = useMemo(rayTex, []);
  const g = useRef<THREE.Group>(null);
  const rays = useMemo(() => { const r = rng(7); return Array.from({ length: 7 }, (_, i) => ({ x: -8 + i * 2.8 + r() * 1.5, w: 1 + r() * 2.2, ph: r() * 6 })); }, []);
  useFrame(({ clock }) => {
    g.current?.children.forEach((m, i) => {
      const mat = (m as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = (theme.outdoor ? 0.13 : 0.22) * (0.6 + 0.4 * Math.sin(clock.elapsedTime * 0.5 + rays[i]!.ph));
    });
  });
  return (
    <group ref={g} position={[0, 6, -12]} rotation={[0, 0, theme.sunPos[0] > 0 ? -0.35 : 0.1]}>
      {rays.map((r, i) => (
        <mesh key={i} position={[r.x, 0, 0]}>
          <planeGeometry args={[r.w, 16]} />
          <meshBasicMaterial map={tex} color={theme.sun} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

export function Clouds() {
  const tex = useMemo(cloudTex, []);
  const g = useRef<THREE.Group>(null);
  const list = useMemo(() => { const r = rng(3); return Array.from({ length: 8 }, () => ({ x: -60 + r() * 120, y: 16 + r() * 14, z: -70 - r() * 30, s: 18 + r() * 16, v: 0.3 + r() * 0.5 })); }, []);
  useFrame((_, d) => g.current?.children.forEach((c, i) => { c.position.x += list[i]!.v * Math.min(d, 0.05); if (c.position.x > 70) c.position.x = -70; }));
  return <group ref={g}>{list.map((c, i) => (
    <sprite key={i} position={[c.x, c.y, c.z]} scale={[c.s, c.s * 0.5, 1]}><spriteMaterial map={tex} transparent opacity={0.85} depthWrite={false} fog={false} /></sprite>
  ))}</group>;
}

function Sway({ children, amt = 0.08, speed = 1.2, phase = 0, ...p }: { children: React.ReactNode; amt?: number; speed?: number; phase?: number; position?: [number, number, number]; scale?: number }) {
  const r = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (r.current) { r.current.rotation.z = Math.sin(clock.elapsedTime * speed + phase) * amt; r.current.rotation.x = Math.cos(clock.elapsedTime * speed * 0.7 + phase) * amt * 0.5; } });
  return <group ref={r} {...p}>{children}</group>;
}

function Pine({ c, snow }: { c: string; snow?: boolean }) {
  return <>
    <mesh position={[0, 0.6, 0]} castShadow><cylinderGeometry args={[0.12, 0.2, 1.2, 6]} /><meshStandardMaterial color="#5a3a22" /></mesh>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[0, 1.6 + i * 0.85, 0]} castShadow><coneGeometry args={[1.1 - i * 0.28, 1.6, 8]} /><meshStandardMaterial color={snow && i === 2 ? "#f4f8fb" : c} flatShading roughness={0.9} /></mesh>
    ))}
  </>;
}
function RoundTree({ c, c2 }: { c: string; c2: string }) {
  return <>
    <mesh position={[0, 0.8, 0]} castShadow><cylinderGeometry args={[0.14, 0.22, 1.6, 6]} /><meshStandardMaterial color="#5a3a22" /></mesh>
    <mesh position={[0, 2.2, 0]} castShadow><icosahedronGeometry args={[1.1, 1]} /><meshStandardMaterial color={c} flatShading /></mesh>
    <mesh position={[0.5, 2.7, 0.2]} castShadow><icosahedronGeometry args={[0.7, 1]} /><meshStandardMaterial color={c2} flatShading /></mesh>
  </>;
}
function Palm() {
  return <>
    {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[i * 0.12, 0.4 + i * 0.7, 0]} rotation-z={-0.15}><cylinderGeometry args={[0.13, 0.16, 0.75, 7]} /><meshStandardMaterial color={i % 2 ? "#8a6a3a" : "#7a5a2a"} /></mesh>)}
    <Sway position={[0.55, 3.7, 0]} amt={0.06}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <mesh key={i} rotation={[0.5, (i / 7) * Math.PI * 2, 0]} position={[Math.cos((i / 7) * 6.28) * 0.8, -0.2, Math.sin((i / 7) * 6.28) * 0.8]}>
          <boxGeometry args={[0.35, 0.03, 1.8]} /><meshStandardMaterial color={i % 2 ? "#3f9a3a" : "#2f8a2f"} />
        </mesh>
      ))}
    </Sway>
  </>;
}
function Crystal({ c }: { c: string }) {
  return <mesh position={[0, 0.8, 0]} rotation-z={0.2}><octahedronGeometry args={[0.7, 0]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.4} roughness={0.1} metalness={0.3} transparent opacity={0.9} /></mesh>;
}
function Rock({ c }: { c: string }) { return <mesh position={[0, 0.3, 0]} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={c} flatShading roughness={0.95} /></mesh>; }
function Coral({ c }: { c: string }) {
  return <>{[0, 1, 2, 3].map((i) => <mesh key={i} position={[Math.sin(i * 2) * 0.3, 0.4 + i * 0.1, Math.cos(i * 2) * 0.3]} rotation-z={Math.sin(i) * 0.5}><cylinderGeometry args={[0.06, 0.12, 0.9 + i * 0.2, 6]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.25} /></mesh>)}</>;
}
function Tower() {
  // Stone tower with crenellations, banded roof, glowing windows and a flag.
  const flag = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 3) * 0.35; });
  return <>
    <mesh position={[0, 2, 0]} castShadow><cylinderGeometry args={[0.72, 0.85, 4, 14]} /><meshStandardMaterial color="#efe2c0" roughness={0.75} /></mesh>
    <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.95, 1, 0.5, 14]} /><meshStandardMaterial color="#cbb98f" roughness={0.9} /></mesh>
    {Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.8, 4.15, Math.sin(a) * 0.8]} castShadow><boxGeometry args={[0.28, 0.35, 0.28]} /><meshStandardMaterial color="#f5ead0" /></mesh>; })}
    {[1.4, 2.6].map((y) => [0, 2.1, 4.2].map((a, j) => <mesh key={y + "-" + j} position={[Math.sin(a) * 0.8, y, Math.cos(a) * 0.8]} rotation-y={a}><boxGeometry args={[0.2, 0.4, 0.06]} /><meshStandardMaterial color="#ffd77a" emissive="#ffb030" emissiveIntensity={1.2} /></mesh>))}
    <mesh position={[0, 5.05, 0]} castShadow><coneGeometry args={[1, 1.8, 14]} /><meshStandardMaterial color="#3a6ad0" metalness={0.3} roughness={0.35} /></mesh>
    <mesh position={[0, 4.35, 0]}><torusGeometry args={[0.88, 0.06, 6, 20]} /><meshStandardMaterial color="#e8b030" metalness={0.9} roughness={0.2} /></mesh>
    <mesh position={[0, 6.3, 0]}><cylinderGeometry args={[0.03, 0.03, 0.9, 6]} /><meshStandardMaterial color="#e8b030" metalness={0.9} /></mesh>
    <mesh ref={flag} position={[0, 6.55, 0.28]}><boxGeometry args={[0.02, 0.3, 0.55]} /><meshStandardMaterial color="#e83a3a" /></mesh>
  </>;
}

/** Cozy fisherman's cabin with chimney smoke, lantern and boat. */
function Cabin() {
  const smoke = useRef<THREE.Group>(null);
  useFrame((_, d) => smoke.current?.children.forEach((c, i) => { c.position.y += Math.min(d, 0.05) * 0.5; const t = c.position.y; if (t > 2.4) c.position.y = 0; c.scale.setScalar(0.25 + t * 0.25); ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t / 2.4); void i; }));
  const wood = useMemo(woodTex, []);
  return <group>
    <mesh position={[0, 0.2, 0]} receiveShadow><boxGeometry args={[3.4, 0.4, 2.8]} /><meshStandardMaterial color="#6a6a66" roughness={1} flatShading /></mesh>
    <mesh position={[0, 1.3, 0]} castShadow><boxGeometry args={[3, 1.8, 2.4]} /><meshStandardMaterial map={wood} color="#b07a48" roughness={0.9} /></mesh>
    {[-1, 1].map((s) => <mesh key={s} position={[0, 2.75, s * 0.68]} rotation-x={s * 0.75} castShadow><boxGeometry args={[3.4, 0.12, 1.85]} /><meshStandardMaterial color="#b0402a" roughness={0.7} /></mesh>)}
    <mesh position={[0, 2.6, 0]} rotation-x={Math.PI / 4}><boxGeometry args={[3, 1.15, 1.15]} /><meshStandardMaterial map={wood} color="#9a6a3a" /></mesh>
    <mesh position={[0.9, 3.1, -0.4]} castShadow><boxGeometry args={[0.4, 1.1, 0.4]} /><meshStandardMaterial color="#8a7a70" flatShading /></mesh>
    <group ref={smoke} position={[0.9, 3.7, -0.4]}>{[0, 0.8, 1.6].map((y, i) => <mesh key={i} position={[0, y, 0]}><sphereGeometry args={[0.4, 8, 6]} /><meshBasicMaterial color="#e8e8ee" transparent opacity={0.4} depthWrite={false} /></mesh>)}</group>
    <mesh position={[0, 1.05, 1.21]}><boxGeometry args={[0.7, 1.3, 0.05]} /><meshStandardMaterial color="#5a3420" /></mesh>
    {[-0.95, 0.95].map((x) => <group key={x} position={[x, 1.5, 1.21]}>
      <mesh><boxGeometry args={[0.6, 0.55, 0.04]} /><meshStandardMaterial color="#ffd98a" emissive="#ffb040" emissiveIntensity={1} /></mesh>
      <mesh position={[0, 0, 0.02]}><boxGeometry args={[0.66, 0.06, 0.04]} /><meshStandardMaterial color="#f4ead8" /></mesh>
      <mesh position={[0, 0, 0.02]}><boxGeometry args={[0.06, 0.6, 0.04]} /><meshStandardMaterial color="#f4ead8" /></mesh>
      <mesh position={[0, -0.36, 0.1]}><boxGeometry args={[0.7, 0.16, 0.2]} /><meshStandardMaterial color="#4a8a3a" /></mesh>
      {[-0.2, 0, 0.2].map((f) => <mesh key={f} position={[f, -0.24, 0.12]}><sphereGeometry args={[0.07, 6, 6]} /><meshStandardMaterial color={f ? "#ff6a8a" : "#ffd03a"} /></mesh>)}
    </group>)}
    <mesh position={[0.6, 1.95, 1.35]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color="#ffe0a0" emissive="#ffb030" emissiveIntensity={2} /></mesh>
    <pointLight position={[0.6, 1.9, 1.7]} color="#ffb85a" intensity={4} distance={6} />
    <group position={[2.6, 0.25, 1.8]} rotation-y={0.5}>
      <mesh scale={[0.6, 0.35, 1.8]}><sphereGeometry args={[1, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial color="#d84a3a" side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2} scale={[0.55, 1.7, 1]}><circleGeometry args={[1, 16]} /><meshStandardMaterial map={wood} color="#c09060" /></mesh>
    </group>
  </group>;
}

/** Floating lantern buoys for magical worlds. */
function Lanterns({ color }: { color: string }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => g.current?.children.forEach((c, i) => { c.position.y = 2 + Math.sin(clock.elapsedTime * 0.8 + i) * 0.4; }));
  return <group ref={g}>{Array.from({ length: 8 }, (_, i) => (
    <mesh key={i} position={[-10 + i * 2.8, 2, -10 - (i % 3) * 4]}><octahedronGeometry args={[0.25, 0]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} /></mesh>
  ))}</group>;
}

/** Mountains in the distance. */
function Mountains({ theme }: { theme: WorldTheme }) {
  const list = useMemo(() => { const r = rng(11); return Array.from({ length: 14 }, (_, i) => ({ x: -70 + i * 11 + r() * 5, z: -55 - r() * 15, h: 12 + r() * 16, w: 10 + r() * 8 })); }, []);
  const snow = theme.foliage === "ice" || theme.foliage === "pine";
  const col = theme.foliage === "lava" ? "#3a2020" : theme.foliage === "golden" ? "#b0785a" : theme.foliage === "ice" ? "#9ab4d0" : "#5a7f8a";
  return <>{list.map((m, i) => (
    <group key={i} position={[m.x, 0, m.z]}>
      <mesh position={[0, m.h / 2 - 1, 0]}><coneGeometry args={[m.w, m.h, 7]} /><meshStandardMaterial color={col} flatShading roughness={1} /></mesh>
      {snow && <mesh position={[0, m.h - 1 - m.h * 0.12, 0]}><coneGeometry args={[m.w * 0.25, m.h * 0.25, 7]} /><meshStandardMaterial color="#ffffff" flatShading /></mesh>}
    </group>
  ))}</>;
}

function Waterfall({ position }: { position: [number, number, number] }) {
  const tex = useMemo(() => { const t = new THREE.CanvasTexture((() => { const cv = document.createElement("canvas"); cv.width = 64; cv.height = 256; const c = cv.getContext("2d")!; c.fillStyle = "#cdefff"; c.fillRect(0, 0, 64, 256); for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,255,255,${Math.random()})`; c.fillRect(Math.random() * 64, Math.random() * 256, 2, 20 + Math.random() * 40); } return cv; })()); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }, []);
  useFrame((_, d) => { tex.offset.y += d * 1.2; });
  return <group position={position}>
    <mesh position={[0, 4, 0]}><planeGeometry args={[4, 8]} /><meshStandardMaterial map={tex} transparent opacity={0.9} emissive="#ffffff" emissiveIntensity={0.25} /></mesh>
    <Rock c="#5a6a5a" />
    <mesh position={[-2.6, 3.5, -0.5]} scale={[1.4, 4, 1.4]}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#56665a" flatShading /></mesh>
    <mesh position={[2.6, 3.5, -0.5]} scale={[1.4, 4, 1.4]}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#56665a" flatShading /></mesh>
  </group>;
}

function Volcano() {
  const lava = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => { if (lava.current) lava.current.emissiveIntensity = 2 + Math.sin(clock.elapsedTime * 2) * 0.6; });
  return <group position={[0, 0, -45]}>
    <mesh position={[0, 9, 0]}><coneGeometry args={[16, 20, 10, 1, true]} /><meshStandardMaterial color="#2a1a18" flatShading /></mesh>
    <mesh position={[0, 19, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[2.2, 16]} /><meshStandardMaterial ref={lava} color="#ff5a1a" emissive="#ff3a00" emissiveIntensity={2} /></mesh>
    {[-0.4, 0.3].map((r, i) => <mesh key={i} position={[r * 10, 9, 7]} rotation={[0.55, 0, r]}><boxGeometry args={[1, 20, 0.2]} /><meshStandardMaterial color="#ff6a1a" emissive="#ff4a00" emissiveIntensity={1.6} /></mesh>)}
    <pointLight position={[0, 22, 0]} color="#ff5a1a" intensity={200} distance={60} />
  </group>;
}

/** Everything around the lake, chosen by theme.foliage. */
export function Surroundings({ theme }: { theme: WorldTheme }) {
  const grass = useMemo(() => groundTex(theme.ground), [theme]);
  const items = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: 56 }, (_, i) => {
      const a = Math.PI * (0.05 + (i / 56) * 0.9) + (r() - 0.5) * 0.05; const rad = 16 + r() * 12;
      return { x: Math.cos(a) * rad * 1.3, z: -Math.sin(a) * rad - 4, s: 0.8 + r() * 0.9, k: r() };
    });
  }, []);
  const f = theme.foliage;
  const pick = (k: number) => {
    switch (f) {
      case "pine": return k < 0.85 ? <Pine c={k < 0.4 ? "#2f6a3a" : "#3a7a3a"} /> : <Rock c="#7d8580" />;
      case "palm": case "coral": return k < 0.6 ? <Palm /> : k < 0.8 ? <RoundTree c="#3a9a3a" c2="#5ab04a" /> : <Rock c="#c8b88a" />;
      case "golden": return k < 0.7 ? <RoundTree c={k < 0.35 ? "#e8902a" : "#f0b83a"} c2="#d86a1a" /> : <Pine c="#5a7a2a" />;
      case "crystal": return k < 0.5 ? <Crystal c={k < 0.25 ? "#5ad1ff" : "#7a8aff"} /> : <Rock c="#2a3a5a" />;
      case "ice": return k < 0.6 ? <Pine c="#3a6a5a" snow /> : <Rock c="#e0ecf5" />;
      case "jungle": return k < 0.75 ? <RoundTree c={k < 0.4 ? "#2a7a2a" : "#3a9a3a"} c2="#5ac04a" /> : <Palm />;
      case "cave": return k < 0.45 ? <Crystal c={k < 0.2 ? "#b86bff" : "#6a5aff"} /> : <Rock c="#2a2440" />;
      case "lava": return k < 0.25 ? <Crystal c="#ff5a1a" /> : <Rock c="#2a1c1c" />;
      case "castle": return k < 0.15 ? <Tower /> : k < 0.7 ? <Palm /> : <RoundTree c="#3aa04a" c2="#6ac05a" />;
    }
  };
  return (
    <group>
      {theme.outdoor && f !== "lava" && <Mountains theme={theme} />}
      {f === "lava" && <Volcano />}
      {f === "jungle" && <Waterfall position={[-9, 0, -20]} />}
      {(f === "pine" || f === "golden" || f === "ice") && <group position={[-8.5, 0, -9]} rotation-y={0.55} scale={0.9}><Cabin /></group>}
      {(f === "crystal" || f === "cave" || f === "castle") && <Lanterns color={theme.accent} />}
      {f === "castle" && <group position={[0, 0, -30]} scale={2.2}><Tower /><group position={[-2.2, 0, 0.5]} scale={0.7}><Tower /></group><group position={[2.2, 0, 0.5]} scale={0.7}><Tower /></group></group>}
      {!theme.outdoor && f !== "lava" && (
        <group>
          {Array.from({ length: 18 }, (_, i) => { const a = Math.PI * (i / 17); return (
            <mesh key={i} position={[Math.cos(a) * 30, 6, -Math.sin(a) * 26 - 6]} scale={[5, 12, 5]}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={theme.ground} flatShading roughness={1} /></mesh>); })}
          {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[-18 + i * 4, 15, -18 - (i % 3) * 3]} rotation-x={Math.PI}><coneGeometry args={[0.6, 4, 6]} /><meshStandardMaterial color={theme.ground} flatShading /></mesh>)}
        </group>
      )}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, -4]} receiveShadow><ringGeometry args={[15, 70, 64, 1, 0, Math.PI]} /><meshStandardMaterial map={grass} roughness={1} /></mesh>
      {items.map((t, i) => <group key={i} position={[t.x, 0, t.z]} scale={t.s}>{pick(t.k)}</group>)}
      <Plants theme={theme} />
      <Dock />
    </group>
  );
}

function Plants({ theme }: { theme: WorldTheme }) {
  const r = useMemo(() => rng(99), []);
  const reeds = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ x: (i < 11 ? -1 : 1) * (3 + r() * 6), z: 1.5 - r() * 9, h: 0.8 + r() * 0.9, ph: r() * 6 })), [r]);
  const pads = useMemo(() => Array.from({ length: 14 }, () => ({ x: (r() - 0.5) * 16, z: -3 - r() * 12, s: 0.3 + r() * 0.35, rot: r() * 6, flower: r() < 0.35 })), [r]);
  const weed = useMemo(() => Array.from({ length: 16 }, () => ({ x: (r() - 0.5) * 14, z: -2 - r() * 12, h: 0.5 + r() * 0.6, ph: r() * 6 })), [r]);
  const lush = !["ice", "lava", "cave", "crystal"].includes(theme.foliage);
  const flowerC = theme.foliage === "coral" ? "#ff7a9a" : "#ff9ac8";
  return <group>
    {lush && reeds.map((d, i) => (
      <Sway key={i} position={[d.x, -0.2, d.z]} phase={d.ph} amt={0.1}>
        <mesh position={[0, d.h / 2, 0]}><cylinderGeometry args={[0.015, 0.03, d.h, 4]} /><meshStandardMaterial color="#5a8a2a" /></mesh>
        <mesh position={[0, d.h, 0]}><capsuleGeometry args={[0.04, 0.16, 2, 6]} /><meshStandardMaterial color="#6a4020" /></mesh>
      </Sway>
    ))}
    {lush && pads.map((p, i) => (
      <group key={i} position={[p.x, 0.03, p.z]} rotation-y={p.rot}>
        <mesh rotation-x={-Math.PI / 2} scale={p.s}><circleGeometry args={[1, 14, 0.3, Math.PI * 1.8]} /><meshStandardMaterial color="#3f8a2f" side={THREE.DoubleSide} /></mesh>
        {p.flower && <mesh position={[0, 0.06, 0]}><coneGeometry args={[0.1, 0.12, 6]} /><meshStandardMaterial color={flowerC} emissive={flowerC} emissiveIntensity={0.2} /></mesh>}
      </group>
    ))}
    {weed.map((w, i) => (
      <Sway key={i} position={[w.x, -1.05, w.z]} phase={w.ph} amt={0.2} speed={0.8}>
        <mesh position={[0, w.h / 2, 0]}><boxGeometry args={[0.05, w.h, 0.02]} /><meshStandardMaterial color={theme.foliage === "cave" ? "#6a3aa0" : theme.foliage === "coral" ? "#ff7a5a" : "#3a7a3a"} /></mesh>
      </Sway>
    ))}
  </group>;
}

function Dock() {
  const tex = useMemo(woodTex, []);
  return <group position={[0, 0.3, 3]}>
    {Array.from({ length: 8 }, (_, i) => (
      <mesh key={i} position={[(i % 3) * 0.01, 0, -i * 0.4]} castShadow receiveShadow><boxGeometry args={[2.4, 0.1, 0.36]} /><meshStandardMaterial map={tex} color={i % 2 ? "#c09060" : "#b08050"} roughness={0.85} /></mesh>
    ))}
    {[[-1.15, -2.9], [1.15, -2.9], [-1.15, -0.2], [1.15, -0.2]].map(([x, z], i) => (
      <mesh key={i} position={[x!, -0.35, z!]}><cylinderGeometry args={[0.1, 0.1, 1.1, 8]} /><meshStandardMaterial map={tex} color="#7a5030" /></mesh>
    ))}
    <mesh position={[-0.85, 0.2, -2.4]} castShadow><cylinderGeometry args={[0.2, 0.18, 0.3, 12]} /><meshStandardMaterial color="#2a6ac0" roughness={0.5} /></mesh>
  </group>;
}

export function Sparkles({ theme }: { theme: WorldTheme }) {
  // Floating motes / glints (fireflies in caves, pollen outside).
  const tex = useMemo(softDot, []);
  const pts = useRef<THREE.Points>(null);
  const geo = useMemo(() => { const r = rng(5); const a = new Float32Array(120 * 3); for (let i = 0; i < 120; i++) { a[i * 3] = (r() - 0.5) * 30; a[i * 3 + 1] = 0.3 + r() * 5; a[i * 3 + 2] = -r() * 20; } const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(a, 3)); return g; }, []);
  useFrame(({ clock }) => { if (pts.current) { pts.current.rotation.y = Math.sin(clock.elapsedTime * 0.05) * 0.2; pts.current.position.y = Math.sin(clock.elapsedTime * 0.4) * 0.3; } });
  return <points ref={pts} geometry={geo}><pointsMaterial map={tex} size={theme.outdoor ? 0.12 : 0.22} color={theme.outdoor ? "#fff8d0" : theme.accent} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></points>;
}
