import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import type { WorldDef } from "./data";
import type { Live } from "./live";
import { Clouds, LakeBed, SkyDome, Sparkles, SunRays, Surroundings, WaterSurface } from "./scene/World";
import { School } from "./scene/Fish";
import { RodRig } from "./scene/RodRig";
import { Splashes } from "./scene/Splashes";

function Ready({ onReady }: { onReady: () => void }) {
  const n = useRef(0);
  useFrame(() => { n.current++; if (n.current === 3) onReady(); });
  return null;
}

export function LakeScene({ world, live, onReady, fishColor, fishSize }: { world: WorldDef; live: Live; onReady: () => void; fishColor: string; fishSize: number }) {
  const th = world.theme;
  return (
    <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      camera={{ position: [0, 2.3, 5.5], fov: 58, near: 0.1, far: 400 }} onCreated={({ camera }) => camera.lookAt(0, 0.3, -5)}>
      <fog attach="fog" args={[th.fog, 25, 110]} />
      <hemisphereLight args={[th.skyTop, th.ground, th.outdoor ? 0.9 : 0.6]} />
      <directionalLight position={[th.sunPos[0] * 0.3, Math.max(th.sunPos[1], 8), 10]} intensity={th.light} color={th.sun} castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} />
      {!th.outdoor && <pointLight position={[0, 6, -6]} color={th.accent} intensity={60} distance={30} />}
      <Environment resolution={64}>
        <Lightformer intensity={2} color={th.skyBottom} position={[0, 5, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={1.2} color={th.sun} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
      </Environment>
      <SkyDome theme={th} />
      {th.outdoor && <Clouds />}
      <Surroundings theme={th} />
      <LakeBed theme={th} />
      <SunRays theme={th} />
      <Sparkles theme={th} />
      <Splashes />
      <Suspense fallback={null}>
        <School fish={world.fish} />
        <RodRig live={live} fishColor={fishColor} fishSize={fishSize} />
      </Suspense>
      <WaterSurface theme={th} />
      <Ready onReady={onReady} />
    </Canvas>
  );
}
