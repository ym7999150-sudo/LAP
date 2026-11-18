"use client";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace, Vector2, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useSettings } from "@/lib/client/settings";
import { sfx } from "@/lib/client/sound";
import { nearestTerminal, TABLE_SIZE, terminalWorld } from "./geometry";
import { PourFx } from "./PourFx";
import { SceneObjectView } from "./SceneObject";
import { useEditor } from "./store";
import { useSim } from "./useSimulation";
import { Wires } from "./Wires";

const CAMERA_HOME = new Vector3(0, 3.1, 4.1);

function Bench() {
  const select = useEditor((s) => s.select);
  const selectWire = useEditor((s) => s.selectWire);
  const moveDraft = useEditor((s) => s.moveDraft);
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (useEditor.getState().draft) moveDraft([e.point.x, 0.12, e.point.z]);
  };
  return (
    <group>
      {/* Bench top */}
      <mesh position={[0, -0.06, 0]} receiveShadow onPointerMove={onMove} onPointerDown={(e) => {
        if (useEditor.getState().tool === "select") {
          select(null);
          selectWire(null);
        }
        void e;
      }}>
        <boxGeometry args={[TABLE_SIZE.w, 0.12, TABLE_SIZE.d]} />
        <meshStandardMaterial color="#1a2029" roughness={0.75} metalness={0.05} />
      </mesh>
      {/* Edge trim */}
      <mesh position={[0, -0.005, TABLE_SIZE.d / 2]}>
        <boxGeometry args={[TABLE_SIZE.w, 0.012, 0.02]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.4} />
      </mesh>
      <gridHelper args={[TABLE_SIZE.w, 36, "#26303c", "#202832"]} position={[0, 0.001, 0]} scale={[1, 1, TABLE_SIZE.d / TABLE_SIZE.w]} />
      {/* Large invisible plane catches pointer moves beyond the bench while dragging a wire */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} visible={false} onPointerMove={onMove}>
        <planeGeometry args={[60, 60]} />
      </mesh>
      {/* Floor & legs */}
      <mesh position={[0, -2.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0c0f13" roughness={1} />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[(x! * TABLE_SIZE.w) / 2.2, -1.15, (z! * TABLE_SIZE.d) / 2.3]}>
          <boxGeometry args={[0.12, 2.1, 0.12]} />
          <meshStandardMaterial color="#14181e" />
        </mesh>
      ))}
    </group>
  );
}

/** Global pointer-up completes or cancels a wire drag (works for touch, where hover is unreliable). */
function WireDragController() {
  useEffect(() => {
    const up = () => {
      const s = useEditor.getState();
      if (!s.draft) return;
      let target = s.hoverTerminal;
      if (!target) {
        const n = nearestTerminal(s.doc, new Vector3(...s.draft.point), 0.22, s.draft.from);
        if (n) target = { objectId: n.objectId, terminalId: n.terminalId };
      }
      const r = s.finishWire(target);
      s.setHoverTerminal(null);
      if (r === "connected") sfx.snap();
      else if (r === "invalid") sfx.error();
      else sfx.unsnap();
    };
    const cancel = (e: KeyboardEvent) => {
      if (e.key === "Escape" && useEditor.getState().draft) useEditor.setState({ draft: null, hoverTerminal: null });
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", cancel);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", cancel);
    };
  }, []);
  return null;
}

/** Continuous electrical sounds driven by simulation results. */
function CircuitAudio() {
  const circuit = useSim((s) => s.circuit);
  const objects = useEditor((s) => s.doc.objects);
  const wasShort = useRef(false);
  useEffect(() => {
    for (const o of objects) {
      const a = circuit.components[o.id]?.activity ?? 0;
      if (o.type === "buzzer" || o.type === "motor") {
        if (a > 0.05) sfx.loop(o.id, o.type, a);
        else sfx.stopLoop(o.id);
      }
    }
    const short = circuit.issues.some((i) => i.code === "short-circuit");
    if (short && !wasShort.current) sfx.short();
    wasShort.current = short;
  }, [circuit, objects]);
  useEffect(() => () => sfx.stopAll(), []);
  return null;
}

/** Development-only hook used by automated UI checks to locate terminals on screen. */
function DevProbe() {
  const { camera, size, scene, raycaster } = useThree();
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as Record<string, unknown>).__lv = {
      editor: useEditor,
      sim: useSim,
      pick: (x: number, y: number) => {
        raycaster.setFromCamera(new Vector2((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1), camera);
        return raycaster.intersectObjects(scene.children, true).filter((h) => h.object.type !== "GridHelper" && h.object.type !== "LineSegments").slice(0, 8).map((h) => `${h.object.name || h.object.type}@${h.distance.toFixed(2)}`);
      },
      size,
      project: (objectId: string, terminalId?: string) => {
        const o = useEditor.getState().doc.objects.find((x) => x.id === objectId);
        if (!o) return null;
        const v = terminalId ? terminalWorld(o, terminalId) : new Vector3(...o.position);
        if (!v) return null;
        v.project(camera);
        return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
      },
    };
  }, [camera, size, scene, raycaster]);
  return null;
}

function Objects() {
  const objects = useEditor((s) => s.doc.objects);
  const quality = useSettings((s) => s.quality);
  return (
    <group>
      {objects.map((o) => (
        <SceneObjectView key={o.id} obj={o} quality={quality} />
      ))}
    </group>
  );
}

export function LabScene({ lab, cameraRef }: { lab: "physics" | "chemistry"; cameraRef?: React.RefObject<(() => void) | null> }) {
  const quality = useSettings((s) => s.quality);
  const dragging = useEditor((s) => s.dragging);
  const draft = useEditor((s) => s.draft);
  const controls = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    if (cameraRef)
      (cameraRef as React.RefObject<(() => void) | null>).current = () => {
        const c = controls.current;
        if (!c) return;
        c.object.position.copy(CAMERA_HOME);
        c.target.set(0, 0, 0);
        c.update();
      };
  }, [cameraRef]);
  const dpr: [number, number] = quality === "low" ? [1, 1] : quality === "medium" ? [1, 1.5] : [1, 2];
  return (
    <Canvas
      shadows={quality !== "low"}
      dpr={dpr}
      camera={{ position: CAMERA_HOME.toArray(), fov: 40, near: 0.05, far: 100 }}
      gl={{ antialias: quality !== "low", powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
      className="viewport-touch"
      onCreated={({ gl }) => gl.setClearColor("#0b0e12")}
    >
      <fog attach="fog" args={["#0b0e12", 12, 30]} />
      <hemisphereLight args={["#cfe8ff", "#0b0e12", 0.45]} />
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[4, 8, 5]}
        intensity={1.4}
        castShadow={quality !== "low"}
        shadow-mapSize={quality === "high" ? [2048, 2048] : [1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />
      <spotLight position={[-4, 6, -2]} angle={0.6} penumbra={0.8} intensity={lab === "chemistry" ? 18 : 10} color="#a5f3fc" />
      <Suspense fallback={null}>
        {/* Procedural studio environment (no downloaded HDR) for glass and metal reflections */}
        <Environment resolution={quality === "high" ? 256 : 64} frames={1}>
          <Lightformer intensity={2} position={[0, 5, -6]} scale={[10, 4, 1]} color="#dbeafe" />
          <Lightformer intensity={1.2} position={[-6, 3, 0]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#22d3ee" />
          <Lightformer intensity={0.8} position={[6, 2, 2]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} color="#ffffff" />
        </Environment>
      </Suspense>
      <Bench />
      {quality !== "low" && <ContactShadows position={[0, 0.002, 0]} scale={[TABLE_SIZE.w, TABLE_SIZE.d]} opacity={0.45} blur={2.4} far={1.2} resolution={quality === "high" ? 1024 : 512} />}
      <Objects />
      <Wires />
      <PourFx />
      <WireDragController />
      <CircuitAudio />
      <DevProbe />
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={!dragging && !draft}
        enableDamping
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={14}
        maxPolarAngle={Math.PI * 0.46}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
