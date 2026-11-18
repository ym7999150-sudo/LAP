"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, InstancedMesh, Object3D, type Vector3Tuple } from "three";

const dummy = new Object3D();

/** Bubbles rising inside a liquid column. `rate` 0..1 controls how many are alive. */
export function Bubbles({ radius, height, rate, color = "#ffffff", count = 60 }: { radius: number; height: number; rate: number; color?: string; count?: number }) {
  const ref = useRef<InstancedMesh>(null);
  const state = useMemo(
    () => Array.from({ length: count }, () => ({ x: 0, y: -1, z: 0, s: 0, v: 0, wob: Math.random() * 6, alive: false })),
    [count],
  );
  const rateRef = useRef(rate);
  rateRef.current = rate;
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const r = rateRef.current;
    for (let i = 0; i < state.length; i++) {
      const b = state[i]!;
      if (!b.alive) {
        if (r > 0 && Math.random() < r * dt * 18 && height > 0.02) {
          const a = Math.random() * Math.PI * 2;
          const rr = Math.sqrt(Math.random()) * radius * 0.85;
          Object.assign(b, { x: Math.cos(a) * rr, z: Math.sin(a) * rr, y: 0.01, s: 0.006 + Math.random() * 0.014, v: 0.12 + Math.random() * 0.25, alive: true });
        } else {
          dummy.position.set(0, -10, 0);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          m.setMatrixAt(i, dummy.matrix);
          continue;
        }
      }
      b.y += b.v * dt;
      b.v += dt * 0.15;
      b.wob += dt * 9;
      if (b.y > height) b.alive = false;
      dummy.position.set(b.x + Math.sin(b.wob) * 0.004, b.y, b.z + Math.cos(b.wob) * 0.004);
      dummy.scale.setScalar(b.s * (1 + b.y * 0.6));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial color={color} transparent opacity={0.55} roughness={0.05} metalness={0.1} />
    </instancedMesh>
  );
}

/** Precipitate flakes drifting down through the liquid. */
export function Flakes({ radius, height, active, color, count = 80 }: { radius: number; height: number; active: number; color: string; count?: number }) {
  const ref = useRef<InstancedMesh>(null);
  const state = useMemo(() => Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0, v: 0, s: 0, rot: 0, alive: false })), [count]);
  const act = useRef(active);
  act.current = active;
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < state.length; i++) {
      const p = state[i]!;
      if (!p.alive) {
        if (act.current > 0 && Math.random() < act.current * dt * 10) {
          const a = Math.random() * Math.PI * 2;
          const rr = Math.sqrt(Math.random()) * radius * 0.85;
          Object.assign(p, { x: Math.cos(a) * rr, z: Math.sin(a) * rr, y: height * (0.4 + Math.random() * 0.6), v: 0.03 + Math.random() * 0.05, s: 0.006 + Math.random() * 0.01, rot: Math.random() * 6, alive: true });
        } else {
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          m.setMatrixAt(i, dummy.matrix);
          continue;
        }
      }
      p.y -= p.v * dt;
      p.rot += dt;
      p.x += Math.sin(p.rot * 2) * 0.002 * dt;
      if (p.y < 0.01) p.alive = false;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rot, p.rot * 0.7, 0);
      dummy.scale.set(p.s, p.s * 0.4, p.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </instancedMesh>
  );
}

/** Hot sparks thrown out in arcs (burning steel wool, magnesium). World-space ballistic particles. */
export function Sparks({ origin, active, color = "#ffb347", count = 140, spread = 1 }: { origin: Vector3Tuple; active: number; color?: string; count?: number; spread?: number }) {
  const ref = useRef<InstancedMesh>(null);
  const state = useMemo(() => Array.from({ length: count }, () => ({ p: [0, 0, 0], v: [0, 0, 0], life: 0, max: 1 })), [count]);
  const act = useRef(active);
  act.current = active;
  const col = useMemo(() => new Color(color), [color]);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < state.length; i++) {
      const s = state[i]!;
      if (s.life <= 0) {
        if (act.current > 0 && Math.random() < act.current * dt * 25) {
          const a = Math.random() * Math.PI * 2;
          const up = 0.6 + Math.random() * 1.6;
          const out = (0.3 + Math.random() * 1.2) * spread;
          s.p = [origin[0], origin[1], origin[2]];
          s.v = [Math.cos(a) * out, up, Math.sin(a) * out];
          s.max = s.life = 0.35 + Math.random() * 0.7;
        } else {
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          m.setMatrixAt(i, dummy.matrix);
          continue;
        }
      }
      s.life -= dt;
      s.v[1]! -= 3.2 * dt;
      s.p[0]! += s.v[0]! * dt;
      s.p[1]! += s.v[1]! * dt;
      s.p[2]! += s.v[2]! * dt;
      if (s.p[1]! < 0.005) {
        s.p[1] = 0.005;
        s.v[1] = -s.v[1]! * 0.3;
        s.v[0]! *= 0.5;
        s.v[2]! *= 0.5;
      }
      const speed = Math.hypot(s.v[0]!, s.v[1]!, s.v[2]!);
      dummy.position.set(s.p[0]!, s.p[1]!, s.p[2]!);
      dummy.lookAt(s.p[0]! + s.v[0]!, s.p[1]! + s.v[1]!, s.p[2]! + s.v[2]!);
      const k = s.life / s.max;
      dummy.scale.set(0.011 * k, 0.011 * k, 0.02 + speed * 0.04 * k);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={col} toneMapped={false} blending={AdditiveBlending} transparent depthWrite={false} />
    </instancedMesh>
  );
}

/** Soft rising puffs: steam, smoke, CO2 mist. */
export function Puffs({ origin, active, color = "#ffffff", count = 40, opacity = 0.18, rise = 0.5 }: { origin: Vector3Tuple; active: number; color?: string; count?: number; opacity?: number; rise?: number }) {
  const ref = useRef<InstancedMesh>(null);
  const state = useMemo(() => Array.from({ length: count }, () => ({ p: [0, 0, 0], life: 0, max: 1, s: 0 })), [count]);
  const act = useRef(active);
  act.current = active;
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < state.length; i++) {
      const s = state[i]!;
      if (s.life <= 0) {
        if (act.current > 0 && Math.random() < act.current * dt * 6) {
          s.p = [origin[0] + (Math.random() - 0.5) * 0.06, origin[1], origin[2] + (Math.random() - 0.5) * 0.06];
          s.max = s.life = 1.6 + Math.random() * 1.4;
          s.s = 0.03 + Math.random() * 0.03;
        } else {
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          m.setMatrixAt(i, dummy.matrix);
          continue;
        }
      }
      s.life -= dt;
      s.p[1]! += rise * dt;
      s.p[0]! += Math.sin(s.life * 3 + i) * 0.04 * dt;
      const k = 1 - s.life / s.max;
      dummy.position.set(s.p[0]!, s.p[1]!, s.p[2]!);
      dummy.scale.setScalar(s.s * (1 + k * 2.2));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={false} roughness={1} />
    </instancedMesh>
  );
}

/** Flickering flame cone built from layered additive shells. */
export function Flame({ position, scale = 1, color = "#3b82f6", inner = "#a5f3fc", intensity = 1 }: { position: Vector3Tuple; scale?: number; color?: string; inner?: string; intensity?: number }) {
  const g = useRef<import("three").Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.elapsedTime;
    g.current.scale.set(scale * (1 + Math.sin(t * 23) * 0.04), scale * (1 + Math.sin(t * 17) * 0.08 + Math.sin(t * 41) * 0.04), scale * (1 + Math.cos(t * 19) * 0.04));
    g.current.rotation.y = t * 0.6;
  });
  return (
    <group ref={g} position={position}>
      <mesh position={[0, 0.09, 0]}>
        <coneGeometry args={[0.045, 0.2, 16, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.45 * intensity} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <coneGeometry args={[0.025, 0.11, 16, 1, true]} />
        <meshBasicMaterial color={inner} transparent opacity={0.7 * intensity} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.12, 0]} color={color} intensity={0.6 * intensity} distance={1.4} />
    </group>
  );
}
