"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, type Group, InstancedMesh, Object3D, QuadraticBezierCurve3, Vector3 } from "three";
import { getSubstance } from "@/lib/chem/substances";
import { sfx } from "@/lib/client/sound";
import { fillHeight, PROFILES, profileKey, SteelWoolTuft } from "./models/chemistry";
import { useEditor, type FxRequest } from "./store";
import { useSim } from "./useSimulation";

export const POUR_MS = 2400;
const dummy = new Object3D();

const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));

function surfaceY(id: string) {
  const s = useEditor.getState().doc.objects.find((o) => o.id === id);
  if (!s) return 0.1;
  const prof = PROFILES[profileKey(s.type)]!;
  const view = useSim.getState().chem.containers[id];
  const frac = view ? view.volumeMl / view.capacityMl : 0;
  return s.position[1] + Math.max(prof.inner[0]![1] + 0.01, fillHeight(prof, frac));
}

function rimY(id: string) {
  const s = useEditor.getState().doc.objects.find((o) => o.id === id);
  if (!s) return 0.4;
  return s.position[1] + PROFILES[profileKey(s.type)]!.height;
}

/** Pose of a container that is currently being poured (null when idle). Called every frame. */
export function pourPose(objId: string): { position: [number, number, number]; tilt: number; axis: [number, number, number] } | null {
  const st = useEditor.getState();
  const f = st.fx.find((x) => x.kind === "pour" && x.fromId === objId);
  if (!f) return null;
  const src = st.doc.objects.find((o) => o.id === objId);
  const dst = st.doc.objects.find((o) => o.id === f.toId);
  if (!src || !dst) return null;
  const p = (performance.now() - f.startedAt) / POUR_MS;
  if (p >= 1) return null;
  const dir = new Vector3(src.position[0] - dst.position[0], 0, src.position[2] - dst.position[2]);
  if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
  dir.normalize();
  const hover = new Vector3(dst.position[0] + dir.x * 0.24, rimY(dst.id) + 0.12, dst.position[2] + dir.z * 0.24);
  const home = new Vector3(...src.position);
  const move = p < 0.22 ? ease(p / 0.22) : p > 0.88 ? 1 - ease((p - 0.88) / 0.12) : 1;
  const pos = home.clone().lerp(hover, move);
  const tilt = p < 0.22 ? 0 : p < 0.38 ? ease((p - 0.22) / 0.16) * 1.75 : p < 0.78 ? 1.75 + Math.sin(p * 40) * 0.015 : p < 0.88 ? (1 - ease((p - 0.78) / 0.1)) * 1.75 : 0;
  // Tilt toward the target: rotate around the horizontal axis perpendicular to dir.
  const axis: [number, number, number] = [-dir.z, 0, dir.x];
  return { position: [pos.x, pos.y, pos.z], tilt: -tilt, axis };
}

/** Falling liquid stream made of instanced droplets along a ballistic curve, with splash droplets. */
function Stream({ fx }: { fx: FxRequest }) {
  const ref = useRef<InstancedMesh>(null);
  const splash = useRef<InstancedMesh>(null);
  const N = 70;
  const S = 24;
  const color = useMemo(() => new Color(fx.color), [fx.color]);
  const drops = useMemo(() => Array.from({ length: S }, () => ({ p: new Vector3(), v: new Vector3(), life: 0 })), []);
  useFrame(({ clock }, dt) => {
    const m = ref.current;
    if (!m) return;
    const st = useEditor.getState();
    const dst = st.doc.objects.find((o) => o.id === fx.toId);
    const src = fx.fromId ? st.doc.objects.find((o) => o.id === fx.fromId) : null;
    if (!dst) return;
    const p = (performance.now() - fx.startedAt) / POUR_MS;
    const flowing = p > 0.33 && p < 0.84;
    const flowAmt = flowing ? Math.min(1, (p - 0.33) / 0.05, (0.84 - p) / 0.05) : 0;
    const dir = new Vector3(src ? src.position[0] - dst.position[0] : 1, 0, src ? src.position[2] - dst.position[2] : 0.4);
    if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
    dir.normalize();
    const top = rimY(dst.id) + 0.16;
    const start = new Vector3(dst.position[0] + dir.x * 0.1, top, dst.position[2] + dir.z * 0.1);
    const end = new Vector3(dst.position[0] + dir.x * 0.02, surfaceY(dst.id), dst.position[2] + dir.z * 0.02);
    const ctrl = new Vector3(start.x - dir.x * 0.05, start.y + 0.02, start.z - dir.z * 0.05);
    const curve = new QuadraticBezierCurve3(start, ctrl, end);
    const t0 = clock.elapsedTime;
    for (let i = 0; i < N; i++) {
      const u = (i / N + t0 * 1.6) % 1;
      const pt = curve.getPoint(u);
      const jitter = Math.sin(i * 12.9 + t0 * 30) * 0.003;
      dummy.position.set(pt.x + jitter, pt.y, pt.z - jitter);
      const thick = (0.016 - u * 0.006) * flowAmt;
      dummy.scale.set(thick, thick * 2.2, thick);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    const sm = splash.current;
    if (sm) {
      for (let i = 0; i < S; i++) {
        const d = drops[i]!;
        if (d.life <= 0 && flowAmt > 0.3 && Math.random() < dt * 30) {
          d.p.copy(end);
          const a = Math.random() * Math.PI * 2;
          d.v.set(Math.cos(a) * 0.25, 0.4 + Math.random() * 0.4, Math.sin(a) * 0.25);
          d.life = 0.25 + Math.random() * 0.2;
        }
        if (d.life > 0) {
          d.life -= dt;
          d.v.y -= 4 * dt;
          d.p.addScaledVector(d.v, dt);
          if (d.p.y < end.y) d.life = 0;
        }
        dummy.position.copy(d.p);
        dummy.scale.setScalar(d.life > 0 ? 0.007 : 0);
        dummy.updateMatrix();
        sm.setMatrixAt(i, dummy.matrix);
      }
      sm.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={color} transparent opacity={0.75} roughness={0.05} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={splash} args={[undefined, undefined, S]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshStandardMaterial color={color} transparent opacity={0.8} roughness={0.05} />
      </instancedMesh>
    </>
  );
}

/** A reagent bottle that appears above the target, tilts and pours. */
function GhostBottle({ fx }: { fx: FxRequest }) {
  const g = useRef<Group>(null);
  useFrame(() => {
    const st = useEditor.getState();
    const dst = st.doc.objects.find((o) => o.id === fx.toId);
    if (!g.current || !dst) return;
    const p = (performance.now() - fx.startedAt) / POUR_MS;
    const appear = p < 0.15 ? ease(p / 0.15) : p > 0.9 ? 1 - ease((p - 0.9) / 0.1) : 1;
    const tilt = p < 0.2 ? 0 : p < 0.36 ? ease((p - 0.2) / 0.16) * 2.0 : p < 0.8 ? 2.0 : p < 0.9 ? (1 - ease((p - 0.8) / 0.1)) * 2.0 : 0;
    g.current.position.set(dst.position[0] + 0.3, rimY(dst.id) + 0.2 + (1 - appear) * 0.3, dst.position[2] + 0.12);
    g.current.rotation.set(0, 0, tilt);
    g.current.scale.setScalar(0.8 * appear + 0.001);
  });
  const sub = getSubstance(fx.substanceId ?? "");
  return (
    <group ref={g}>
      <group position={[0, -0.05, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.24, 20]} />
          <meshStandardMaterial color={sub?.state === "aq" || sub?.state === "l" ? "#bfe3ff" : "#6b4423"} transparent opacity={0.55} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.072, 0.072, 0.12, 20]} />
          <meshStandardMaterial color={fx.color} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.03, 0.05, 0.06, 16]} />
          <meshStandardMaterial color="#bfe3ff" transparent opacity={0.55} />
        </mesh>
      </group>
    </group>
  );
}

/** Solid reagent tipped from a spatula: granules fall and splash into the liquid. */
function FallingSolid({ fx }: { fx: FxRequest }) {
  const ref = useRef<InstancedMesh>(null);
  const spat = useRef<Group>(null);
  const N = 40;
  const parts = useMemo(() => Array.from({ length: N }, (_, i) => ({ delay: 0.35 + (i / N) * 0.3 + Math.random() * 0.05, ox: (Math.random() - 0.5) * 0.04, oz: (Math.random() - 0.5) * 0.04, s: 0.008 + Math.random() * 0.008 })), []);
  const sub = getSubstance(fx.substanceId ?? "");
  const isMetal = sub?.cls === "metal";
  useFrame(() => {
    const st = useEditor.getState();
    const dst = st.doc.objects.find((o) => o.id === fx.toId);
    if (!ref.current || !dst) return;
    const p = (performance.now() - fx.startedAt) / POUR_MS;
    const top = rimY(dst.id) + 0.18;
    const bottom = surfaceY(dst.id);
    if (spat.current) {
      const appear = p < 0.15 ? ease(p / 0.15) : p > 0.85 ? 1 - ease((p - 0.85) / 0.15) : 1;
      spat.current.position.set(dst.position[0] + 0.05, top + 0.02, dst.position[2]);
      spat.current.rotation.set(p > 0.3 && p < 0.75 ? -0.9 : 0, 0, 0);
      spat.current.scale.setScalar(appear + 0.001);
    }
    for (let i = 0; i < N; i++) {
      const q = parts[i]!;
      const t = (p - q.delay) * POUR_MS / 1000;
      if (t < 0) {
        dummy.scale.setScalar(0);
      } else {
        const y = Math.max(bottom - Math.min(0.05, t * 0.05), top - 4.9 * t * t);
        dummy.position.set(dst.position[0] + q.ox, y, dst.position[2] + q.oz);
        dummy.rotation.set(t * 5, t * 3, 0);
        dummy.scale.setScalar(y <= bottom ? q.s * Math.max(0, 1 - (bottom - y) * 30) : q.s);
      }
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <group ref={spat}>
        <mesh position={[0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.006, 0.006, 0.26, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.25} />
        </mesh>
        <mesh scale={[1, 0.25, 1]}>
          <sphereGeometry args={[0.035, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.25} side={2} />
        </mesh>
      </group>
      <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}>
        {isMetal ? <dodecahedronGeometry args={[1, 0]} /> : <icosahedronGeometry args={[1, 0]} />}
        <meshStandardMaterial color={fx.color} metalness={isMetal ? 0.85 : 0} roughness={isMetal ? 0.35 : 0.9} />
      </instancedMesh>
    </>
  );
}

/** Steel-wool tuft flying from the pad into the container. */
function FlyingTuft({ fx }: { fx: FxRequest }) {
  const g = useRef<Group>(null);
  useFrame(() => {
    const st = useEditor.getState();
    const dst = st.doc.objects.find((o) => o.id === fx.toId);
    const src = fx.fromId ? st.doc.objects.find((o) => o.id === fx.fromId) : null;
    if (!g.current || !dst) return;
    const p = Math.min(1, ((performance.now() - fx.startedAt) / POUR_MS) * 1.8);
    const a = new Vector3(src?.position[0] ?? dst.position[0], 0.35, src?.position[2] ?? dst.position[2]);
    const b = new Vector3(dst.position[0], dst.position[1] + 0.06, dst.position[2]);
    const pos = a.lerp(b, ease(p));
    pos.y += Math.sin(p * Math.PI) * 0.25;
    g.current.position.copy(pos);
    g.current.rotation.set(p * 4, p * 3, 0);
    g.current.visible = p < 0.98;
  });
  return (
    <group ref={g}>
      <SteelWoolTuft scale={0.9} />
    </group>
  );
}

export function PourFx() {
  const fx = useEditor((s) => s.fx);
  const clearFx = useEditor((s) => s.clearFx);
  const started = useRef(new Set<number>());
  useEffect(() => {
    for (const f of fx) {
      if (started.current.has(f.id)) continue;
      started.current.add(f.id);
      if (f.kind === "pour" || f.kind === "add-liquid") setTimeout(() => sfx.pour(1.1), POUR_MS * 0.34);
      if (f.kind === "pour") setTimeout(() => sfx.glass(), POUR_MS * 0.2);
      if (f.kind === "add-solid") setTimeout(() => sfx.place(), POUR_MS * 0.5);
      if (f.kind === "tuft") setTimeout(() => sfx.place(), POUR_MS * 0.5);
      setTimeout(() => clearFx(f.id), POUR_MS + 50);
    }
  }, [fx, clearFx]);
  return (
    <group>
      {fx.map((f) => (
        <group key={f.id}>
          {(f.kind === "pour" || f.kind === "add-liquid") && <Stream fx={f} />}
          {f.kind === "add-liquid" && <GhostBottle fx={f} />}
          {f.kind === "add-solid" && <FallingSolid fx={f} />}
          {f.kind === "tuft" && <FlyingTuft fx={f} />}
        </group>
      ))}
    </group>
  );
}
