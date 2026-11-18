"use client";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useRef } from "react";
import { AdditiveBlending, type Mesh, type Object3D, type PointLight } from "three";
import type { SceneObject } from "@/lib/scene/schema";
import type { ComponentResult } from "@/lib/sim/circuit/solver";
import { prefersReducedMotion } from "@/lib/client/settings";
import { AssetModel, type Drive } from "../AssetModel";
import { Flame } from "./particles";
import { fmt } from "./physics";

/** Rotate a named node toward a target angle (radians) around one local axis, smoothly. */
export function useNeedleDrive(nodeName: string, axis: "x" | "y" | "z", target: () => number): Drive {
  return useCallback<Drive>(
    (root: Object3D, dt: number) => {
      const n = root.getObjectByName(nodeName);
      if (!n) return;
      if (n.userData.base === undefined) n.userData.base = n.rotation[axis];
      const goal = n.userData.base + target();
      n.rotation[axis] += (goal - n.rotation[axis]) * Math.min(1, dt * 6);
    },
    [nodeName, axis, target],
  );
}

function meterAngle(sim?: ComponentResult) {
  const r = sim?.reading;
  if (r == null || !Number.isFinite(r)) return sim?.readingUnit === "Ω" ? -0.75 : 0.75; // OL pegs the needle
  const u = sim?.readingUnit;
  const frac = u === "Ω" ? 1 - Math.min(1, Math.log10(1 + Math.abs(r)) / 6) : Math.min(1, Math.abs(r) / (u === "A" ? 1 : 12));
  return -0.75 + 1.5 * frac;
}

export function AnalogMeterOverlay({ obj, sim }: { obj: SceneObject; sim?: ComponentResult }) {
  const simRef = useRef(sim);
  simRef.current = sim;
  const drive = useNeedleDrive("retro_multimeter_needle_LOD0", "z", useCallback(() => -meterAngle(simRef.current), []));
  const unit = obj.type === "ammeter" ? "A" : obj.type === "voltmeter" ? "V" : "Ω";
  return (
    <>
      <AssetModel assetId="ph-analog-meter" fallback={null} drive={drive} />
      <Html position={[0, 0.34, 0.12]} center distanceFactor={2.4} className="pointer-events-none select-none">
        <div className="rounded-md border border-emerald-900 bg-[#04120d]/90 px-2 py-0.5 text-center font-mono text-[11px] text-emerald-300 ltr-num">
          <span className="me-1 font-bold text-amber-300">{unit}</span>
          {sim?.readingUnit ? fmt(sim.reading ?? null, sim.readingUnit) : "--"}
        </div>
      </Html>
    </>
  );
}

export function DigitalMeterOverlay({ sim }: { sim?: ComponentResult }) {
  return (
    <>
      <AssetModel assetId="pp-digital-multimeter" fallback={null} />
      <Html position={[0, 0.16, -0.08]} center distanceFactor={2.4} className="pointer-events-none select-none">
        <div className="min-w-[70px] rounded border border-emerald-900 bg-[#04120d] px-2 py-0.5 text-center font-mono text-[12px] text-emerald-300 ltr-num">{sim?.readingUnit ? fmt(sim.reading ?? null, sim.readingUnit) : "--"}</div>
      </Html>
    </>
  );
}

export function CompassOverlay({ deflection }: { deflection: number }) {
  const ref = useRef(deflection);
  ref.current = deflection;
  const drive = useNeedleDrive("seadogs_compass_needle", "y", useCallback(() => ref.current, []));
  return <AssetModel assetId="ph-compass" fallback={null} drive={drive} />;
}

/** Real bulb in a real lamp socket; light output follows the simulated power. */
export function BulbOverlay({ sim, quality }: { sim?: ComponentResult; quality: string }) {
  const a = sim?.activity ?? 0;
  const glow = useRef<Mesh>(null);
  const light = useRef<PointLight>(null);
  useFrame(() => {
    const f = prefersReducedMotion() ? 1 : 0.97 + Math.random() * 0.03;
    if (glow.current) {
      (glow.current.material as { opacity: number }).opacity = Math.min(0.85, a * 0.8 * f);
      glow.current.scale.setScalar(0.11 + a * 0.05);
    }
    if (light.current) light.current.intensity = a * 3.2 * f;
  });
  return (
    <>
      <AssetModel assetId="ph-lamp-socket" fallback={null} />
      <AssetModel assetId="ph-lightbulb" fallback={null} />
      <mesh ref={glow} position={[0, 0.39, 0]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.42, 0]} color="#ffcf80" intensity={0} distance={3.5} decay={2} castShadow={quality === "high" && a > 0.1} />
    </>
  );
}

export function StateBadge({ text, tone, y = 0.28 }: { text: string; tone: "on" | "off" | "bad"; y?: number }) {
  const cls = tone === "on" ? "border-emerald-500 text-emerald-300" : tone === "bad" ? "border-red-500 text-red-300" : "border-slate-500 text-slate-300";
  return (
    <Html position={[0, y, 0]} center distanceFactor={2.4} className="pointer-events-none select-none">
      <div className={`rounded-full border bg-black/75 px-2 py-0.5 text-[10px] font-bold ${cls}`}>{text}</div>
    </Html>
  );
}

export function BurnerFlame({ lit }: { lit: boolean }) {
  return lit ? <Flame position={[0, 0.24, 0]} scale={0.9} /> : null;
}
