"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, DoubleSide, type Group, LatheGeometry, type Mesh, type MeshStandardMaterial, Vector2 } from "three";
import type { ContainerView } from "@/lib/chem/engine";
import { getSubstance } from "@/lib/chem/substances";
import type { SceneObject } from "@/lib/scene/schema";
import { Bubbles, Flakes, Flame, Puffs, Sparks } from "./particles";

/** Inner profile of each container: radius as a function of height (local units). */
export interface ContainerProfile {
  height: number;
  /** [radius, y] points from bottom to rim (inner wall). */
  inner: [number, number][];
  glass: boolean;
}

export const PROFILES: Record<string, ContainerProfile> = {
  beaker: { height: 0.42, inner: [[0, 0.012], [0.17, 0.012], [0.17, 0.42]], glass: true },
  "beaker-small": { height: 0.3, inner: [[0, 0.01], [0.12, 0.01], [0.12, 0.3]], glass: true },
  "test-tube": { height: 0.5, inner: [[0, 0.035], [0.022, 0.04], [0.033, 0.06], [0.04, 0.09], [0.04, 0.5]], glass: true },
  flask: { height: 0.5, inner: [[0, 0.012], [0.2, 0.012], [0.21, 0.04], [0.06, 0.34], [0.05, 0.36], [0.05, 0.5]], glass: true },
  cylinder: { height: 0.62, inner: [[0, 0.04], [0.06, 0.04], [0.06, 0.62]], glass: true },
  crucible: { height: 0.14, inner: [[0, 0.02], [0.05, 0.022], [0.09, 0.08], [0.11, 0.14]], glass: false },
};

export function profileKey(type: string) {
  return type === "beaker-250" ? "beaker" : type === "beaker-100" ? "beaker-small" : type === "conical-flask" ? "flask" : type === "measuring-cylinder" ? "cylinder" : type === "crucible" ? "crucible" : "test-tube";
}

/** Inner radius at height y (linear interpolation along the profile). */
function radiusAt(p: ContainerProfile, y: number) {
  const pts = p.inner;
  for (let i = 1; i < pts.length; i++) {
    const [r0, y0] = pts[i - 1]!;
    const [r1, y1] = pts[i]!;
    if (y <= y1) return y1 === y0 ? r1 : r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
  }
  return pts[pts.length - 1]![0];
}

/** Height reached by a given fraction of the total inner volume. */
export function fillHeight(p: ContainerProfile, fraction: number) {
  if (fraction <= 0) return 0;
  const N = 80;
  const base = p.inner[0]![1];
  const dy = (p.height - base) / N;
  const vols: number[] = [0];
  for (let i = 0; i < N; i++) {
    const r = radiusAt(p, base + (i + 0.5) * dy);
    vols.push(vols[i]! + Math.PI * r * r * dy);
  }
  const target = Math.min(1, fraction) * vols[N]!;
  for (let i = 1; i <= N; i++) if (vols[i]! >= target) return base + (i - 1 + (target - vols[i - 1]!) / (vols[i]! - vols[i - 1]!)) * dy;
  return p.height;
}

function latheUpTo(p: ContainerProfile, h: number, inset = 0.004) {
  const pts: Vector2[] = [];
  const base = p.inner[0]![1];
  pts.push(new Vector2(0, base));
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const y = base + ((h - base) * i) / steps;
    pts.push(new Vector2(Math.max(0.001, radiusAt(p, y) - inset), y));
  }
  pts.push(new Vector2(0, h));
  return new LatheGeometry(pts, 40);
}

function GlassBody({ profile, quality }: { profile: ContainerProfile; quality: string }) {
  const geo = useMemo(() => {
    const pts = profile.inner.map(([r, y]) => new Vector2(r + 0.006, Math.max(0, y - 0.012)));
    pts.unshift(new Vector2(0, 0));
    const last = profile.inner[profile.inner.length - 1]!;
    pts.push(new Vector2(last[0] + 0.016, last[1]));
    return new LatheGeometry(pts, 48);
  }, [profile]);
  if (!profile.glass)
    return (
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color="#e7e5e4" roughness={0.8} side={DoubleSide} />
      </mesh>
    );
  return (
    <mesh geometry={geo} castShadow={quality !== "low"} renderOrder={2}>
      {quality === "high" ? (
        <meshPhysicalMaterial color="#e9f6ff" transmission={0.96} roughness={0.04} thickness={0.02} ior={1.5} transparent opacity={0.35} side={DoubleSide} depthWrite={false} />
      ) : (
        <meshStandardMaterial color="#d8ecff" transparent opacity={0.18} roughness={0.05} metalness={0.1} side={DoubleSide} depthWrite={false} />
      )}
    </mesh>
  );
}

/** Graduation marks for beakers and cylinders. */
function Graduations({ profile }: { profile: ContainerProfile }) {
  const marks = useMemo(() => {
    const out: number[] = [];
    for (let f = 0.2; f < 0.95; f += 0.2) out.push(fillHeight(profile, f));
    return out;
  }, [profile]);
  return (
    <group>
      {marks.map((y, i) => (
        <mesh key={i} position={[0, y, radiusAt(profile, y) + 0.008]}>
          <boxGeometry args={[0.05, 0.004, 0.001]} />
          <meshBasicMaterial color="#9fb3c8" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

export interface ChemFx {
  gas: number; // 0..1 bubbling intensity
  precip: number;
  flame: number;
  sparks: number;
  steam: number;
  smoke: number;
  flash: number;
}

interface ContainerModelProps {
  obj: SceneObject;
  view?: ContainerView;
  fx: ChemFx;
  quality: "low" | "medium" | "high";
  tilt?: number;
}

/** Glass container with an animated liquid whose level, colour and effects follow the chemistry engine. */
export function Container({ obj, view, fx, quality }: ContainerModelProps) {
  const geomKey = profileKey(obj.type);
  const profile = PROFILES[geomKey]!;
  const capacity = view?.capacityMl ?? Number(obj.props.capacity ?? 250);
  const targetFrac = view ? view.volumeMl / capacity : 0;

  const display = useRef({ frac: targetFrac, color: new Color(view?.liquidColor ?? "#d8ecff"), opacity: view?.liquidOpacity ?? 0.3 });
  const liquidRef = useRef<Mesh>(null);
  const surfRef = useRef<Mesh>(null);
  const matRef = useRef<MeshStandardMaterial>(null);
  const surfMat = useRef<MeshStandardMaterial>(null);
  const targetColor = useMemo(() => new Color(view?.liquidColor ?? "#d8ecff"), [view?.liquidColor]);
  const fullGeo = useMemo(() => latheUpTo(profile, profile.height - 0.002), [profile]);
  const quantH = useRef(0);

  useFrame(({ clock }, dt) => {
    const d = display.current;
    d.frac += (targetFrac - d.frac) * Math.min(1, dt * 1.8);
    d.color.lerp(targetColor, Math.min(1, dt * 1.2));
    d.opacity += ((view?.liquidOpacity ?? 0.3) - d.opacity) * Math.min(1, dt * 2);
    const h = fillHeight(profile, d.frac);
    quantH.current = h;
    if (liquidRef.current) {
      // Scale a full-height lathe in Y to the current level — cheap and exact for cylinders,
      // visually faithful for tapered vessels at school-level fill ranges.
      const visible = d.frac > 0.002;
      liquidRef.current.visible = visible;
      const base = profile.inner[0]![1];
      const sy = Math.max(0.0001, (h - base) / (profile.height - 0.002 - base));
      liquidRef.current.scale.set(1, sy, 1);
      liquidRef.current.position.y = base * (1 - sy);
    }
    if (surfRef.current) {
      surfRef.current.visible = d.frac > 0.002;
      const r = radiusAt(profile, h) - 0.004;
      const wobble = fx.gas > 0 ? Math.sin(clock.elapsedTime * 30) * 0.002 * fx.gas : 0;
      surfRef.current.position.y = h + wobble;
      surfRef.current.scale.set(r, r, r);
      surfRef.current.rotation.z = Math.sin(clock.elapsedTime * 2.2) * 0.02 * Math.min(1, fx.gas + 0.2);
    }
    if (matRef.current) {
      matRef.current.color.copy(d.color);
      matRef.current.opacity = d.opacity;
    }
    if (surfMat.current) {
      surfMat.current.color.copy(d.color);
      surfMat.current.opacity = Math.min(0.95, d.opacity + 0.1);
    }
  });

  const h = fillHeight(profile, targetFrac);
  const r = radiusAt(profile, Math.max(h, profile.inner[0]![1] + 0.01));
  const solids = view?.solids ?? [];
  const precipitates = solids.filter((s) => getSubstance(s.id)?.cls !== "metal" && s.id !== "steel-wool");
  const metals = solids.filter((s) => getSubstance(s.id)?.cls === "metal" && s.id !== "steel-wool");
  const wool = solids.find((s) => s.id === "steel-wool");
  const burnt = solids.find((s) => s.id === "fe2o3");
  const precipColor = precipitates[0]?.color ?? "#ffffff";
  const precipAmount = precipitates.reduce((a, s) => a + (s.massG ?? 0), 0);
  const bottom = profile.inner[0]![1];

  return (
    <group>
      <GlassBody profile={profile} quality={quality} />
      {profile.glass && geomKey !== "test-tube" && <Graduations profile={profile} />}
      {/* Liquid */}
      <mesh ref={liquidRef} geometry={fullGeo} renderOrder={1}>
        <meshStandardMaterial ref={matRef} transparent roughness={0.15} metalness={0} depthWrite={false} />
      </mesh>
      <mesh ref={surfRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial ref={surfMat} transparent roughness={0.05} metalness={0.2} depthWrite={false} />
      </mesh>
      {/* Settled precipitate layer */}
      {precipAmount > 0.001 && (
        <mesh position={[0, bottom + Math.min(0.05, 0.004 + precipAmount * 0.03) / 2, 0]}>
          <cylinderGeometry args={[radiusAt(profile, bottom + 0.01) - 0.006, radiusAt(profile, bottom) - 0.006, Math.min(0.05, 0.004 + precipAmount * 0.03), 32]} />
          <meshStandardMaterial color={precipColor} roughness={0.95} />
        </mesh>
      )}
      {/* Metal pieces */}
      {metals.map((m, i) => (
        <MetalPieces key={m.id} color={m.color} count={Math.min(9, 2 + Math.round((m.massG ?? 0.5) * 4))} radius={radiusAt(profile, bottom + 0.02) * 0.7} y={bottom + 0.015} seed={i} />
      ))}
      {(wool || burnt) && <SteelWoolTuft position={[0, bottom + 0.035, 0]} scale={geomKey === "crucible" ? 0.9 : 0.6} burnt={!!burnt && !wool} glowing={fx.sparks > 0.05} />}
      {/* Effects */}
      {fx.gas > 0.01 && h > 0.02 && <Bubbles radius={r} height={h} rate={fx.gas} count={quality === "low" ? 25 : 70} />}
      {fx.precip > 0.01 && h > 0.02 && <Flakes radius={r} height={h} active={fx.precip} color={precipColor} count={quality === "low" ? 30 : 90} />}
      {fx.steam > 0.01 && <Puffs origin={[0, profile.height, 0]} active={fx.steam} color="#e5eef7" opacity={0.12} />}
      {fx.smoke > 0.01 && <Puffs origin={[0, profile.height * 0.7, 0]} active={fx.smoke} color="#d4d4d8" opacity={0.07} rise={0.3} />}
      {fx.flame > 0.01 && <Flame position={[0, bottom + 0.04, 0]} scale={0.9} color="#ffffff" inner="#fff7d6" intensity={fx.flame * 2} />}
      {fx.flash > 0.01 && <pointLight position={[0, 0.3, 0]} color="#ffffff" intensity={fx.flash * 18} distance={6} />}
      {fx.sparks > 0.01 && (
        <>
          <Sparks origin={[0, bottom + 0.05, 0]} active={fx.sparks} count={quality === "low" ? 50 : 160} />
          <pointLight position={[0, bottom + 0.1, 0]} color="#ff8a2a" intensity={fx.sparks * 3} distance={2.2} />
        </>
      )}
    </group>
  );
}

function MetalPieces({ color, count, radius, y, seed }: { color: string; count: number; radius: number; y: number; seed: number }) {
  const pieces = useMemo(() => {
    let s = 1234 + seed * 77;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: count }, () => {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * radius;
      return { p: [Math.cos(a) * r, y + rnd() * 0.01, Math.sin(a) * r] as [number, number, number], rot: [rnd() * 3, rnd() * 3, rnd() * 3] as [number, number, number], s: 0.012 + rnd() * 0.01 };
    });
  }, [count, radius, y, seed]);
  return (
    <group>
      {pieces.map((p, i) => (
        <mesh key={i} position={p.p} rotation={p.rot} scale={p.s} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={color} metalness={0.85} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/** Tangled fibre ball made from thin torus knots. */
export function SteelWoolTuft({ position = [0, 0, 0], scale = 1, burnt = false, glowing = false }: { position?: [number, number, number]; scale?: number; burnt?: boolean; glowing?: boolean }) {
  const g = useRef<Group>(null);
  const knots = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ rot: [i * 0.9, i * 1.7, i * 0.4] as [number, number, number], p: 2 + (i % 3), q: 3 + (i % 4) })), []);
  useFrame(({ clock }) => {
    if (!g.current || !glowing) return;
    g.current.children.forEach((c, i) => {
      const m = (c as Mesh).material as MeshStandardMaterial;
      m.emissiveIntensity = 1.5 + Math.sin(clock.elapsedTime * 20 + i) * 0.8;
    });
  });
  return (
    <group ref={g} position={position} scale={scale * 0.05}>
      {knots.map((k, i) => (
        <mesh key={i} rotation={k.rot} castShadow>
          <torusKnotGeometry args={[0.7, 0.025, 120, 4, k.p, k.q]} />
          <meshStandardMaterial color={burnt ? "#5b2a14" : "#9aa0a8"} metalness={burnt ? 0.2 : 0.9} roughness={burnt ? 0.9 : 0.35} emissive={glowing ? "#ff6a00" : "#000000"} emissiveIntensity={glowing ? 1.5 : 0} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------ other equipment ------------------------------ */

export function Bottle({ obj }: { obj: SceneObject }) {
  const s = getSubstance(String(obj.props.substanceId ?? ""));
  return (
    <group>
      <mesh position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.3, 24]} />
        <meshStandardMaterial color="#6b4423" transparent opacity={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.08, 16]} />
        <meshStandardMaterial color="#6b4423" transparent opacity={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.04, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0, 0.17, 0.101]}>
        <planeGeometry args={[0.14, 0.1]} />
        <meshStandardMaterial color={s ? "#f5f5f4" : "#ddd"} />
      </mesh>
    </group>
  );
}

export function SteelWoolPad() {
  return (
    <group>
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[0.2, 0.22, 0.03, 32]} />
        <meshStandardMaterial color="#e7e5e4" roughness={0.8} />
      </mesh>
      <SteelWoolTuft position={[0, 0.09, 0]} scale={2.2} />
    </group>
  );
}

export function Burner({ obj }: { obj: SceneObject }) {
  const lit = obj.props.lit !== false;
  const hot = obj.type === "hot-plate";
  if (hot)
    return (
      <group>
        <mesh position={[0, 0.08, 0]} castShadow>
          <boxGeometry args={[0.5, 0.16, 0.5]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.162, 0]}>
          <cylinderGeometry args={[0.19, 0.19, 0.005, 40]} />
          <meshStandardMaterial color="#1f2937" emissive="#ff3b00" emissiveIntensity={lit ? 0.5 : 0} />
        </mesh>
      </group>
    );
  return (
    <group>
      <mesh position={[0, 0.015, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.03, 32]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.03, 0.24, 20]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* tripod + gauze */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 0.16, 0.22, Math.sin((i * Math.PI * 2) / 3) * 0.16]}>
          <cylinderGeometry args={[0.008, 0.008, 0.44, 6]} />
          <meshStandardMaterial color="#374151" metalness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.445, 0]}>
        <boxGeometry args={[0.4, 0.008, 0.4]} />
        <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.6} wireframe={false} />
      </mesh>
      {lit && <Flame position={[0, 0.26, 0]} scale={0.9} />}
    </group>
  );
}

export function Thermometer({ temp }: { temp?: number }) {
  const t = temp ?? 22;
  const frac = Math.min(1, Math.max(0, (t + 10) / 120));
  return (
    <group rotation={[0, 0, 0.12]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 12]} />
        <meshStandardMaterial color="#f8fafc" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.02, 12, 10]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      <mesh position={[0, 0.02 + frac * 0.27, 0]}>
        <cylinderGeometry args={[0.005, 0.005, frac * 0.55, 8]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
    </group>
  );
}

export function SimpleEquipment({ type }: { type: string }) {
  switch (type) {
    case "balance":
      return (
        <group>
          <mesh position={[0, 0.06, 0]} castShadow>
            <boxGeometry args={[0.5, 0.12, 0.42]} />
            <meshStandardMaterial color="#e5e7eb" />
          </mesh>
          <mesh position={[0, 0.13, -0.02]}>
            <cylinderGeometry args={[0.15, 0.15, 0.01, 32]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.07, 0.212]}>
            <planeGeometry args={[0.2, 0.05]} />
            <meshBasicMaterial color="#052e16" />
          </mesh>
        </group>
      );
    case "pipette":
    case "dropper":
      return (
        <group rotation={[0, 0, Math.PI / 2]} position={[0, 0.03, 0]}>
          <mesh>
            <cylinderGeometry args={[0.012, 0.004, type === "pipette" ? 0.5 : 0.22, 12]} />
            <meshStandardMaterial color="#e0f2fe" transparent opacity={0.5} />
          </mesh>
          {type === "dropper" && (
            <mesh position={[0, 0.13, 0]}>
              <sphereGeometry args={[0.025, 12, 10]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          )}
        </group>
      );
    case "funnel":
      return (
        <group>
          <mesh position={[0, 0.2, 0]}>
            <coneGeometry args={[0.14, 0.18, 32, 1, true]} />
            <meshStandardMaterial color="#e0f2fe" transparent opacity={0.4} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.14, 12]} />
            <meshStandardMaterial color="#e0f2fe" transparent opacity={0.4} />
          </mesh>
        </group>
      );
    case "rod":
      return (
        <mesh position={[0, 0.012, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.5, 10]} />
          <meshStandardMaterial color="#e0f2fe" transparent opacity={0.6} />
        </mesh>
      );
    case "wash-bottle":
      return (
        <group>
          <mesh position={[0, 0.14, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.09, 0.28, 24]} />
            <meshStandardMaterial color="#f8fafc" transparent opacity={0.8} />
          </mesh>
          <mesh position={[0.05, 0.33, 0]} rotation={[0, 0, -0.9]}>
            <cylinderGeometry args={[0.006, 0.006, 0.18, 8]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        </group>
      );
    case "rack":
      return (
        <group>
          <mesh position={[0, 0.02, 0]} castShadow>
            <boxGeometry args={[0.7, 0.04, 0.2]} />
            <meshStandardMaterial color="#a16207" />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.7, 0.03, 0.2]} />
            <meshStandardMaterial color="#a16207" />
          </mesh>
          {[-0.33, 0.33].map((x) => (
            <mesh key={x} position={[x, 0.11, 0]}>
              <boxGeometry args={[0.03, 0.2, 0.2]} />
              <meshStandardMaterial color="#854d0e" />
            </mesh>
          ))}
        </group>
      );
    case "stand":
      return (
        <group>
          <mesh position={[0, 0.015, 0]} castShadow>
            <boxGeometry args={[0.4, 0.03, 0.26]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          <mesh position={[-0.12, 0.45, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.9, 10]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[0.26, 0.03, 0.04]} />
            <meshStandardMaterial color="#6b7280" metalness={0.7} />
          </mesh>
        </group>
      );
    case "goggles":
      return (
        <group position={[0, 0.05, 0]}>
          {[-0.07, 0.07].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.055, 0.015, 8, 24]} />
              <meshStandardMaterial color="#22d3ee" transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
      );
    case "gloves":
      return (
        <mesh position={[0, 0.02, 0]} scale={[1, 0.3, 1.4]} castShadow>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.8} />
        </mesh>
      );
    default:
      return (
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      );
  }
}
