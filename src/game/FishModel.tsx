import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

/** Reusable stylized low-poly fish. Tail wiggles; swim speed controls wiggle rate. */
export function FishModel({ color, belly, scale = 1, wiggle = 8 }: { color: string; belly: string; scale?: number; wiggle?: number }) {
  const tail = useRef<Group>(null);
  const seed = useRef(Math.random() * 10);
  useFrame(({ clock }) => {
    if (tail.current) tail.current.rotation.y = Math.sin(clock.elapsedTime * wiggle + seed.current) * 0.5;
  });
  return (
    <group scale={scale}>
      <mesh scale={[0.5, 0.22, 0.14]} castShadow>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh scale={[0.42, 0.14, 0.12]} position={[0.02, -0.06, 0]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color={belly} roughness={0.5} />
      </mesh>
      <mesh position={[0.36, 0.05, 0.1]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[0.36, 0.05, -0.1]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[0, 0.22, 0]} rotation={[0, 0, -0.3]} scale={[0.2, 0.12, 0.02]}>
        <coneGeometry args={[1, 1, 3]} /><meshStandardMaterial color={color} />
      </mesh>
      <group ref={tail} position={[-0.45, 0, 0]}>
        <mesh position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.18, 0.2, 0.03]}>
          <coneGeometry args={[1, 1, 4]} /><meshStandardMaterial color={color} />
        </mesh>
      </group>
    </group>
  );
}
