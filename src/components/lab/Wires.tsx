"use client";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CatmullRomCurve3, InstancedMesh, Object3D, TubeGeometry, Vector3 } from "three";
import type { Wire } from "@/lib/scene/schema";
import { prefersReducedMotion } from "@/lib/client/settings";
import { terminalWorld } from "./geometry";
import { useEditor } from "./store";
import { useSim } from "./useSimulation";

function cableCurve(a: Vector3, b: Vector3) {
  const d = a.distanceTo(b);
  const lift = 0.08 + d * 0.12;
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.y = Math.max(a.y, b.y) + lift;
  const a1 = a.clone();
  a1.y += 0.06;
  const b1 = b.clone();
  b1.y += 0.06;
  return new CatmullRomCurve3([a, a1, mid, b1, b], false, "centripetal");
}

const dummy = new Object3D();

/** Glowing dots travelling along a conducting wire; speed follows current magnitude, direction its sign. */
function CurrentFlow({ curve, current }: { curve: CatmullRomCurve3; current: number }) {
  const ref = useRef<InstancedMesh>(null);
  const n = Math.max(3, Math.min(14, Math.round(curve.getLength() * 6)));
  const offset = useRef(Math.random());
  const speed = Math.sign(current) * Math.min(1.2, 0.15 + Math.log10(1 + Math.abs(current) * 1000) * 0.25);
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (!prefersReducedMotion()) offset.current = (offset.current + (dt * speed) / curve.getLength()) % 1;
    for (let i = 0; i < n; i++) {
      let t = (i / n + offset.current) % 1;
      if (t < 0) t += 1;
      dummy.position.copy(curve.getPointAt(t));
      dummy.scale.setScalar(0.022);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color="#fde047" toneMapped={false} />
    </instancedMesh>
  );
}

function WireMesh({ wire }: { wire: Wire }) {
  const objects = useEditor((s) => s.doc.objects);
  const selected = useEditor((s) => s.selectedWire === wire.id);
  const tool = useEditor((s) => s.tool);
  const selectWire = useEditor((s) => s.selectWire);
  const flow = useSim((s) => s.circuit.wires[wire.id]);
  const a = objects.find((o) => o.id === wire.from.objectId);
  const b = objects.find((o) => o.id === wire.to.objectId);
  const pa = a ? terminalWorld(a, wire.from.terminalId) : null;
  const pb = b ? terminalWorld(b, wire.to.terminalId) : null;
  const key = pa && pb ? `${pa.toArray().map((x) => x.toFixed(3))}|${pb.toArray().map((x) => x.toFixed(3))}` : "";
  const { curve, geo } = useMemo(() => {
    if (!pa || !pb) return { curve: null, geo: null };
    const c = cableCurve(pa, pb);
    return { curve: c, geo: new TubeGeometry(c, 48, 0.016, 8, false) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!curve || !geo) return null;
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (tool !== "select") return;
    e.stopPropagation();
    selectWire(wire.id);
  };
  return (
    <group>
      <mesh geometry={geo} onPointerDown={onDown} castShadow>
        <meshStandardMaterial color={wire.color} roughness={0.45} emissive={selected ? "#22d3ee" : "#000"} emissiveIntensity={selected ? 0.6 : 0} />
      </mesh>
      {flow?.conducting && <CurrentFlow curve={curve} current={flow.current} />}
    </group>
  );
}

export function Wires() {
  const wires = useEditor((s) => s.doc.wires);
  return (
    <group>
      {wires.map((w) => (
        <WireMesh key={w.id} wire={w} />
      ))}
      <DraftWire />
    </group>
  );
}

/** The cable being dragged from a terminal; follows the pointer and snaps when near a terminal. */
function DraftWire() {
  const draft = useEditor((s) => s.draft);
  const objects = useEditor((s) => s.doc.objects);
  const hover = useEditor((s) => s.hoverTerminal);
  const color = useEditor((s) => s.wireColor);
  const from = draft ? objects.find((o) => o.id === draft.from.objectId) : null;
  const pa = from && draft ? terminalWorld(from, draft.from.terminalId) : null;
  let pb: Vector3 | null = draft ? new Vector3(...draft.point) : null;
  if (hover && draft) {
    const ho = objects.find((o) => o.id === hover.objectId);
    const snapped = ho ? terminalWorld(ho, hover.terminalId) : null;
    if (snapped) pb = snapped;
  }
  const geo = useMemo(() => (pa && pb && pa.distanceTo(pb) > 0.01 ? new TubeGeometry(cableCurve(pa, pb), 40, 0.016, 8, false) : null), [pa?.x, pa?.y, pa?.z, pb?.x, pb?.y, pb?.z]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!geo || !pb) return null;
  return (
    <group>
      <mesh geometry={geo}>
        <meshStandardMaterial color={color} transparent opacity={0.85} emissive={hover ? "#22d3ee" : "#000"} emissiveIntensity={hover ? 0.4 : 0} />
      </mesh>
      <mesh position={pb}>
        <sphereGeometry args={[hover ? 0.045 : 0.03, 16, 12]} />
        <meshBasicMaterial color={hover ? "#22d3ee" : "#e5e7eb"} />
      </mesh>
    </group>
  );
}
