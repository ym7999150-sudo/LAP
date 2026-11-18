"use client";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh, MeshStandardMaterial, PointLight } from "three";
import type { ComponentResult } from "@/lib/sim/circuit/solver";
import type { SceneObject } from "@/lib/scene/schema";
import { prefersReducedMotion } from "@/lib/client/settings";

export interface ModelProps {
  obj: SceneObject;
  sim?: ComponentResult;
  quality: "low" | "medium" | "high";
}

const METAL = { color: "#b9c0c8", metalness: 0.9, roughness: 0.3 } as const;
const DARK = { color: "#1b1f26", metalness: 0.2, roughness: 0.6 } as const;
const BASE = { color: "#2a313c", metalness: 0.1, roughness: 0.8 } as const;

function Base({ w, d, h = 0.04, color = BASE.color }: { w: number; d: number; h?: number; color?: string }) {
  return (
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

export function fmt(v: number | null | undefined, unit: string) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "OL";
  const a = Math.abs(v);
  if (unit === "Ω") {
    if (a >= 1e6) return `${(v / 1e6).toFixed(2)} MΩ`;
    if (a >= 1e3) return `${(v / 1e3).toFixed(2)} kΩ`;
    return `${v.toFixed(a < 10 ? 2 : 1)} Ω`;
  }
  if (a !== 0 && a < 1e-3) return `${(v * 1e6).toFixed(1)} µ${unit}`;
  if (a !== 0 && a < 1) return `${(v * 1e3).toFixed(a < 0.01 ? 2 : 1)} m${unit}`;
  return `${v.toFixed(a < 10 ? 3 : 2)} ${unit}`;
}

function Battery({ obj }: ModelProps) {
  const v = Number(obj.props.voltage ?? 9);
  return (
    <group>
      <mesh position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.62, 32]} />
        <meshStandardMaterial color="#111418" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0.12, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.122, 0.122, 0.24, 32]} />
        <meshStandardMaterial color="#d4a017" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0.33, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.05, 16]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <Html position={[0, 0.27, 0]} center distanceFactor={2.2} className="pointer-events-none select-none">
        <div className="rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-amber-300 ltr-num">{v} V</div>
      </Html>
    </group>
  );
}

function DcSource({ obj, sim }: ModelProps) {
  return (
    <group>
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.8, 0.36, 0.5]} />
        <meshStandardMaterial color="#2b3440" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.24, 0.252]}>
        <planeGeometry args={[0.42, 0.14]} />
        <meshBasicMaterial color="#03100c" />
      </mesh>
      <Html position={[0, 0.24, 0.26]} center distanceFactor={2.4} transform className="pointer-events-none select-none">
        <div className="font-mono text-[11px] text-emerald-400 ltr-num">{Number(obj.props.voltage ?? obj.props.amplitude ?? 0).toFixed(1)}V {sim ? (Math.abs(sim.current) * 1000).toFixed(0) : 0}mA</div>
      </Html>
    </group>
  );
}

function Resistor({ obj }: ModelProps) {
  const bands = ["#8b4513", "#000", "#e11d48", "#d4af37"];
  return (
    <group>
      <mesh position={[0, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 8]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.055, 0.22, 6, 16]} />
        <meshStandardMaterial color={obj.type === "thermistor" ? "#1e40af" : "#d9c39a"} roughness={0.6} />
      </mesh>
      {obj.type === "resistor" &&
        bands.map((c, i) => (
          <mesh key={i} position={[-0.09 + i * 0.055, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.058, 0.058, 0.018, 16]} />
            <meshStandardMaterial color={c} />
          </mesh>
        ))}
    </group>
  );
}

function Rheostat({ obj }: ModelProps) {
  const pos = Number(obj.props.position ?? 50) / 100;
  return (
    <group>
      <Base w={0.9} d={0.24} />
      <mesh position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.7, 24]} />
        <meshStandardMaterial color="#c08a4a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-0.35 + 0.7 * pos, 0.22, 0]}>
        <boxGeometry args={[0.06, 0.06, 0.1]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}

function Potentiometer({ obj }: ModelProps) {
  const pos = Number(obj.props.position ?? 50) / 100;
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.12, 32]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.16, 0]} rotation={[0, -Math.PI * 0.75 + pos * Math.PI * 1.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.12, 16]} />
        <meshStandardMaterial {...METAL} />
        <mesh position={[0, 0.03, 0.03]}>
          <boxGeometry args={[0.012, 0.07, 0.04]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </mesh>
    </group>
  );
}

function Capacitor() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.26, 24]} />
        <meshStandardMaterial color="#1f4fb5" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.295, 0]}>
        <cylinderGeometry args={[0.088, 0.088, 0.01, 24]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
    </group>
  );
}

function Coil({ obj, sim }: ModelProps) {
  const field = sim?.fieldT ?? 0;
  const rings = useRef<Group>(null);
  useFrame((_, dt) => {
    if (rings.current && !prefersReducedMotion()) rings.current.rotation.x += dt * Math.min(3, field * 20);
  });
  const turns = 14;
  return (
    <group>
      <Base w={0.7} d={0.3} />
      <mesh position={[0, 0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.62, 16]} />
        <meshStandardMaterial color={obj.props.ironCore === false ? "#444" : "#6b7280"} metalness={0.8} roughness={0.4} />
      </mesh>
      {Array.from({ length: turns }, (_, i) => (
        <mesh key={i} position={[-0.21 + (i * 0.42) / (turns - 1), 0.14, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.085, 0.014, 8, 24]} />
          <meshStandardMaterial color="#b45309" metalness={0.8} roughness={0.35} />
        </mesh>
      ))}
      {field > 0.001 && (
        <group ref={rings} position={[0, 0.14, 0]}>
          {[0.25, 0.38, 0.52].map((r, i) => (
            <mesh key={i} rotation={[0, 0, 0]} scale={[1.7, 1, 1]}>
              <torusGeometry args={[r, 0.004, 6, 64]} />
              <meshBasicMaterial color="#22d3ee" transparent opacity={Math.min(0.6, field * 4) / (i + 1)} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function Switch({ obj }: ModelProps) {
  const closed = obj.props.closed === true;
  const lever = useRef<Group>(null);
  useFrame((_, dt) => {
    if (!lever.current) return;
    const target = closed ? 0 : -1.0;
    lever.current.rotation.z += (target - lever.current.rotation.z) * Math.min(1, dt * 14);
  });
  return (
    <group>
      <Base w={0.7} d={0.26} color="#3b2f22" />
      <mesh position={[-0.2, 0.08, 0]}>
        <boxGeometry args={[0.06, 0.08, 0.1]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0.2, 0.08, 0]}>
        <boxGeometry args={[0.06, 0.08, 0.1]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <group ref={lever} position={[-0.2, 0.11, 0]} rotation={[0, 0, closed ? 0 : -1]}>
        <mesh position={[0.21, 0, 0]}>
          <boxGeometry args={[0.44, 0.015, 0.05]} />
          <meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.45, 0, 0]}>
          <boxGeometry args={[0.07, 0.06, 0.06]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>
    </group>
  );
}

function PushButton({ obj }: ModelProps) {
  const pressed = obj.props.closed === true;
  return (
    <group>
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[0.3, 0.08, 0.2]} />
        <meshStandardMaterial {...DARK} />
      </mesh>
      <mesh position={[0, pressed ? 0.09 : 0.12, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.06, 24]} />
        <meshStandardMaterial color="#dc2626" roughness={0.4} />
      </mesh>
    </group>
  );
}

function Fuse({ obj, sim }: ModelProps) {
  const blown = sim?.state === "blown" || obj.props.blown === true;
  return (
    <group>
      <mesh position={[0, 0.06, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 24]} />
        <meshPhysicalMaterial color="#e8f4ff" transparent opacity={0.35} roughness={0.05} />
      </mesh>
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 0.06, 24]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
      <mesh position={[0, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.004, blown ? 0.1 : 0.3, 6]} />
        <meshStandardMaterial color={blown ? "#222" : "#d1d5db"} />
      </mesh>
    </group>
  );
}

function Diode({ obj, sim }: ModelProps) {
  const isLed = obj.type === "led";
  const colorMap: Record<string, string> = { red: "#ff2a2a", green: "#22ff6a", blue: "#3b82ff", yellow: "#ffd500" };
  const c = colorMap[String(obj.props.color ?? "red")] ?? "#ff2a2a";
  const a = sim?.activity ?? 0;
  if (!isLed)
    return (
      <group>
        <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.4, 6]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.14, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0.05, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.036, 0.036, 0.02, 16]} />
          <meshStandardMaterial color="#ccc" />
        </mesh>
      </group>
    );
  return (
    <group>
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 0.06, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.08, 6]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
      <mesh position={[0, 0.14, 0]} castShadow>
        <capsuleGeometry args={[0.05, 0.07, 8, 16]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.05 + a * 4} transparent opacity={0.85} roughness={0.2} />
      </mesh>
      {a > 0.02 && <pointLight position={[0, 0.2, 0]} color={c} intensity={a * 1.5} distance={1.5} />}
    </group>
  );
}

function Ic() {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[0.34, 0.06, 0.18]} />
        <meshStandardMaterial color="#111" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Bulb({ sim, quality }: ModelProps) {
  const a = sim?.activity ?? 0;
  const mat = useRef<MeshStandardMaterial>(null);
  const light = useRef<PointLight>(null);
  useFrame(() => {
    // Gentle filament flicker scaled by power.
    const f = prefersReducedMotion() ? 1 : 0.97 + Math.random() * 0.03;
    if (mat.current) mat.current.emissiveIntensity = a * 3.2 * f;
    if (light.current) light.current.intensity = a * 3 * f;
  });
  return (
    <group>
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.08, 24]} />
        <meshStandardMaterial {...DARK} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.08, 24]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <sphereGeometry args={[0.13, 32, 24]} />
        {quality === "high" ? (
          <meshPhysicalMaterial color="#fff8e1" transmission={0.9} roughness={0.05} thickness={0.05} transparent opacity={0.6} emissive="#ffcc66" emissiveIntensity={a * 0.6} />
        ) : (
          <meshStandardMaterial color="#fff8e1" transparent opacity={0.35 + a * 0.4} emissive="#ffcc66" emissiveIntensity={a * 0.8} roughness={0.1} />
        )}
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <torusGeometry args={[0.035, 0.006, 8, 24]} />
        <meshStandardMaterial ref={mat} color="#ffb347" emissive="#ffb347" emissiveIntensity={0} />
      </mesh>
      <pointLight ref={light} position={[0, 0.32, 0]} color="#ffcf80" intensity={0} distance={3.5} decay={2} castShadow={quality === "high" && a > 0.1} />
    </group>
  );
}

function Motor({ sim }: ModelProps) {
  const rotor = useRef<Group>(null);
  const a = sim?.activity ?? 0;
  useFrame((_, dt) => {
    if (rotor.current) rotor.current.rotation.x += dt * a * (prefersReducedMotion() ? 3 : 30);
  });
  return (
    <group>
      <mesh position={[0, 0.13, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.3, 24]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.35} />
      </mesh>
      <group ref={rotor} position={[0.22, 0.13, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.14, 8]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0.06, 0, 0]} rotation={[(i * Math.PI * 2) / 3, 0, 0]}>
            <boxGeometry args={[0.01, 0.22, 0.05]} />
            <meshStandardMaterial color="#22d3ee" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Buzzer({ sim }: ModelProps) {
  const g = useRef<Group>(null);
  const a = sim?.activity ?? 0;
  useFrame(() => {
    if (g.current) g.current.position.y = a > 0.05 && !prefersReducedMotion() ? (Math.random() - 0.5) * 0.006 : 0;
  });
  return (
    <group ref={g}>
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 0.12, 32]} />
        <meshStandardMaterial color="#111" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.131, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.005, 16]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

function Heater({ sim }: ModelProps) {
  const a = sim?.activity ?? 0;
  return (
    <group>
      <Base w={0.7} d={0.3} color="#3f3f46" />
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[-0.21 + i * 0.06, 0.08, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.04, 0.008, 6, 16]} />
          <meshStandardMaterial color="#7c2d12" emissive="#ff3d00" emissiveIntensity={a * 2.5} />
        </mesh>
      ))}
      {a > 0.05 && <pointLight position={[0, 0.2, 0]} color="#ff5a1f" intensity={a} distance={1.2} />}
    </group>
  );
}

function Compass({ obj, deflection = 0 }: ModelProps & { deflection?: number }) {
  const needle = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (needle.current) needle.current.rotation.y += (deflection - needle.current.rotation.y) * Math.min(1, dt * 4);
  });
  void obj;
  return (
    <group>
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.06, 32]} />
        <meshStandardMaterial color="#d6d3d1" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.062, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.004, 32]} />
        <meshStandardMaterial color="#f5f5f4" />
      </mesh>
      <mesh ref={needle} position={[0, 0.075, 0]}>
        <boxGeometry args={[0.02, 0.01, 0.24]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
    </group>
  );
}

function Meter({ obj, sim }: ModelProps) {
  const unit = sim?.readingUnit ?? (obj.type === "ammeter" ? "A" : obj.type === "voltmeter" ? "V" : obj.type === "ohmmeter" ? "Ω" : "");
  const label = obj.type === "ammeter" ? "A" : obj.type === "voltmeter" ? "V" : obj.type === "ohmmeter" ? "Ω" : obj.type === "multimeter" ? "DMM" : "";
  const isMulti = obj.type === "multimeter";
  return (
    <group>
      <mesh position={[0, isMulti ? 0.04 : 0.1, 0]} castShadow rotation={isMulti ? [0, 0, 0] : [0, 0, 0]}>
        <boxGeometry args={isMulti ? [0.34, 0.08, 0.52] : [0.56, 0.2, 0.34]} />
        <meshStandardMaterial color={isMulti ? "#f59e0b" : "#1f2937"} roughness={0.55} />
      </mesh>
      <Html position={isMulti ? [0, 0.1, -0.08] : [0, 0.24, 0]} center distanceFactor={2.4} className="pointer-events-none select-none">
        <div className="min-w-[78px] rounded-md border border-emerald-900 bg-[#04120d] px-2 py-1 text-center font-mono text-[12px] leading-tight text-emerald-300 shadow ltr-num">
          <div className="text-[8px] text-emerald-600">{label}</div>
          {sim?.reading !== undefined || sim?.readingUnit ? fmt(sim?.reading ?? null, unit) : "--"}
        </div>
      </Html>
    </group>
  );
}

function TerminalBlock() {
  return (
    <group>
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[0.38, 0.08, 0.16]} />
        <meshStandardMaterial color="#14532d" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Ground() {
  return (
    <group>
      {[0.16, 0.11, 0.06].map((w, i) => (
        <mesh key={i} position={[0, 0.02 + i * 0.02, 0]}>
          <boxGeometry args={[w, 0.012, 0.03]} />
          <meshStandardMaterial color="#16a34a" />
        </mesh>
      ))}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.06, 6]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
    </group>
  );
}

const MATERIAL_LOOK: Record<string, { color: string; metal: number; rough: number }> = {
  copper: { color: "#b87333", metal: 0.9, rough: 0.3 },
  iron: { color: "#6b7280", metal: 0.8, rough: 0.5 },
  graphite: { color: "#2d2d2d", metal: 0.3, rough: 0.6 },
  plastic: { color: "#3b82f6", metal: 0, rough: 0.4 },
  wood: { color: "#a16207", metal: 0, rough: 0.9 },
  glass: { color: "#cbe7f5", metal: 0, rough: 0.05 },
  rubber: { color: "#111827", metal: 0, rough: 0.95 },
};

function Sample({ obj }: ModelProps) {
  const m = MATERIAL_LOOK[String(obj.props.material ?? "copper")] ?? MATERIAL_LOOK.copper!;
  return (
    <group>
      <Base w={0.56} d={0.18} color="#27272a" />
      <mesh position={[0, 0.07, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 16]} />
        <meshStandardMaterial color={m.color} metalness={m.metal} roughness={m.rough} transparent={obj.props.material === "glass"} opacity={obj.props.material === "glass" ? 0.5 : 1} />
      </mesh>
    </group>
  );
}

function Scope() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[0.6, 0.32, 0.4]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.5} />
      </mesh>
      <mesh position={[-0.08, 0.18, 0.201]}>
        <planeGeometry args={[0.3, 0.2]} />
        <meshBasicMaterial color="#052e16" />
      </mesh>
    </group>
  );
}

function Ldr() {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.03, 24]} />
        <meshStandardMaterial color="#b45309" />
      </mesh>
    </group>
  );
}

export const PHYSICS_MODELS: Record<string, (p: ModelProps & { deflection?: number }) => React.ReactNode> = {
  battery: Battery,
  "dc-source": DcSource,
  resistor: Resistor,
  rheostat: Rheostat,
  potentiometer: Potentiometer,
  capacitor: Capacitor,
  coil: Coil,
  ldr: Ldr,
  switch: Switch,
  "push-button": PushButton,
  fuse: Fuse,
  diode: Diode,
  led: Diode,
  ic: Ic,
  bulb: Bulb,
  motor: Motor,
  buzzer: Buzzer,
  heater: Heater,
  compass: Compass,
  meter: Meter,
  multimeter: Meter,
  scope: Scope,
  "terminal-block": TerminalBlock,
  ground: Ground,
  sample: Sample,
};
