"use client";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Plane, Vector3 } from "three";
import { getComponentDef } from "@/lib/registry";
import type { SceneObject as SObj } from "@/lib/scene/schema";
import { sfx } from "@/lib/client/sound";
import type { Quality } from "@/lib/client/settings";
import { clampToTable, terminalWorld } from "./geometry";
import { Bottle, Burner, Container, SimpleEquipment, SteelWoolPad, SteelWoolTuft, Thermometer } from "./models/chemistry";
import { PHYSICS_MODELS } from "./models/physics";
import { useChemFx } from "./chemFx";
import { useEditor } from "./store";
import { useSim } from "./useSimulation";
import { pourPose } from "./PourFx";
import { AssetModel } from "./AssetModel";
import { AnalogMeterOverlay, BulbOverlay, BurnerFlame, CompassOverlay, DigitalMeterOverlay, FanOverlay, StateBadge } from "./models/overlays";

const floor = new Plane(new Vector3(0, 1, 0), 0);
const hit = new Vector3();

const CONTAINER_TYPES = new Set(["beaker-250", "beaker-100", "test-tube", "conical-flask", "measuring-cylinder", "crucible"]);

function Terminals({ obj }: { obj: SObj }) {
  const def = getComponentDef(obj.type)!;
  const tool = useEditor((s) => s.tool);
  const draft = useEditor((s) => s.draft);
  const hover = useEditor((s) => s.hoverTerminal);
  const wires = useEditor((s) => s.doc.wires);
  const startWire = useEditor((s) => s.startWire);
  const setHover = useEditor((s) => s.setHoverTerminal);
  const setTool = useEditor((s) => s.setTool);
  const readOnly = useEditor((s) => s.readOnly);
  const connected = useMemo(() => {
    const set = new Set<string>();
    for (const w of wires) {
      if (w.from.objectId === obj.id) set.add(w.from.terminalId);
      if (w.to.objectId === obj.id) set.add(w.to.terminalId);
    }
    return set;
  }, [wires, obj.id]);
  const showBig = tool === "wire" || !!draft;
  return (
    <group>
      {def.terminals.map((t) => {
        const isHover = hover?.objectId === obj.id && hover.terminalId === t.id;
        // Clearly visible binding post: red = positive, blue = negative, brass = unpolarised.
        const color = t.polarity === "+" ? "#ef4444" : t.polarity === "-" ? "#3b82f6" : "#d4a72c";
        const isConn = connected.has(t.id);
        return (
          <group key={t.id} position={t.local}>
            <mesh castShadow>
              <cylinderGeometry args={[0.022, 0.022, 0.07, 16]} />
              <meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.045, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.035, 20]} />
              <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} emissive={isHover ? "#22d3ee" : color} emissiveIntensity={isHover ? 1.2 : 0.35} />
            </mesh>
            {/* Always-visible connection ring; pulses wider while wiring, turns green when connected */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.066, 0]}>
              <ringGeometry args={[showBig && !isConn ? 0.048 : 0.044, showBig && !isConn ? 0.07 : 0.054, 32]} />
              <meshBasicMaterial color={isHover ? "#ffffff" : isConn ? "#22c55e" : "#22d3ee"} transparent opacity={0.95} toneMapped={false} />
            </mesh>
            {t.polarity && (
              <mesh position={[0, 0.067, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.04, 0.008]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} />
              </mesh>
            )}
            {t.polarity === "+" && (
              <mesh position={[0, 0.067, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                <planeGeometry args={[0.04, 0.008]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} />
              </mesh>
            )}
            {/* Generous invisible hit target for mouse and touch */}
            <mesh
              name={`term:${obj.id}:${t.id}`}
              onPointerDown={(e: ThreeEvent<PointerEvent>) => {
                if (readOnly) return;
                e.stopPropagation();
                const p = terminalWorld(obj, t.id)!;
                const here = { objectId: obj.id, terminalId: t.id };
                // Select tool on a connected terminal = pull the wire end off (disconnect / re-route).
                if (tool === "select" && connected.has(t.id) && useEditor.getState().detachWireAt(here, [p.x, p.y, p.z])) {
                  sfx.unsnap();
                  return;
                }
                if (tool !== "wire") setTool("wire");
                startWire(here, [p.x, p.y, p.z]);
                sfx.click();
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                if (useEditor.getState().draft) setHover({ objectId: obj.id, terminalId: t.id });
                document.body.style.cursor = "crosshair";
              }}
              onPointerOut={() => {
                const h = useEditor.getState().hoverTerminal;
                if (h?.objectId === obj.id && h.terminalId === t.id) setHover(null);
                document.body.style.cursor = "";
              }}
            >
              <sphereGeometry args={[0.1, 10, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Uses a licensed GLB from the asset manifest when one is registered, otherwise the procedural model. */
function Model({ obj, quality }: { obj: SObj; quality: Quality }) {
  const def = getComponentDef(obj.type)!;
  const sim = useSim((s) => s.circuit.components[obj.id]);
  const procedural = <ProceduralModel obj={obj} quality={quality} />;
  // Containers render their real glass inside <Container> so the simulated liquid stays inside it.
  if (!def.assetId || CONTAINER_TYPES.has(obj.type)) return procedural;
  switch (obj.type) {
    case "bulb":
      return <BulbOverlay sim={sim} quality={quality} />;
    case "ammeter":
    case "voltmeter":
    case "ohmmeter":
      return <AnalogMeterOverlay obj={obj} sim={sim} />;
    case "multimeter":
      return <DigitalMeterOverlay sim={sim} />;
    case "compass":
      return <CompassFromSim obj={obj} />;
    case "battery":
    case "battery-large":
      return (
        <>
          <AssetModel assetId={def.assetId} fallback={procedural} />
          <StateBadge text={`${obj.props.voltage ?? 9} V`} tone="off" y={obj.type === "battery-large" ? 0.4 : 0.32} />
        </>
      );
    case "generator": {
      const rpm = Number(obj.props.rpm ?? 300);
      return (
        <>
          <AssetModel assetId={def.assetId} fallback={procedural} />
          <StateBadge text={`${rpm} rpm · ${(0.02 * rpm).toFixed(1)} V`} tone={rpm > 0 ? "on" : "off"} y={0.55} />
        </>
      );
    }
    case "fan":
      return <FanOverlay assetId={def.assetId} activity={sim?.activity ?? 0} />;
    case "switch":
    case "push-button": {
      const closed = obj.props.closed === true;
      return (
        <>
          <AssetModel assetId={def.assetId} fallback={procedural} />
          <StateBadge text={closed ? "ON ●" : "OFF ○"} tone={closed ? "on" : "off"} y={0.3} />
        </>
      );
    }
    case "fuse": {
      const blown = sim?.state === "blown" || obj.props.blown === true;
      return (
        <>
          <AssetModel assetId={def.assetId} fallback={procedural} />
          {blown && <StateBadge text="✕ BLOWN" tone="bad" y={0.22} />}
        </>
      );
    }
    case "bunsen-burner":
      return (
        <>
          <AssetModel assetId={def.assetId} fallback={procedural} />
          <BurnerFlame lit={obj.props.lit !== false} />
        </>
      );
    default:
      return <AssetModel assetId={def.assetId} fallback={procedural} />;
  }
}

function CompassFromSim({ obj }: { obj: SObj }) {
  const deflection = useSim((s) => {
    let best = 0;
    for (const o of useEditor.getState().doc.objects) {
      if (o.type !== "electromagnet") continue;
      const f = s.circuit.components[o.id]?.fieldT ?? 0;
      const d = Math.hypot(o.position[0] - obj.position[0], o.position[2] - obj.position[2]);
      const k = Math.min(1, (f * 30) / (1 + d * d * 4));
      if (k > Math.abs(best)) best = k * Math.atan2(o.position[0] - obj.position[0], o.position[2] - obj.position[2]);
    }
    return best;
  });
  return <CompassOverlay deflection={deflection} />;
}

function ProceduralModel({ obj, quality }: { obj: SObj; quality: Quality }) {
  const def = getComponentDef(obj.type)!;
  const sim = useSim((s) => s.circuit.components[obj.id]);
  const view = useSim((s) => s.chem.containers[obj.id]);
  const fx = useChemFx((s) => s.levels[obj.id]);
  const deflection = useSim((s) => {
    if (obj.type !== "compass") return 0;
    // Deflect toward the nearest energised electromagnet, scaled by its field and distance.
    let best = 0;
    for (const o of useEditor.getState().doc.objects) {
      if (o.type !== "electromagnet") continue;
      const f = s.circuit.components[o.id]?.fieldT ?? 0;
      const d = Math.hypot(o.position[0] - obj.position[0], o.position[2] - obj.position[2]);
      const k = Math.min(1, (f * 30) / (1 + d * d * 4));
      if (k > Math.abs(best)) best = k * Math.atan2(o.position[0] - obj.position[0], o.position[2] - obj.position[2]);
    }
    return best;
  });
  if (def.lab === "physics") {
    const M = PHYSICS_MODELS[def.geometry];
    return M ? <M obj={obj} sim={sim} quality={quality} deflection={deflection} /> : null;
  }
  if (CONTAINER_TYPES.has(obj.type)) return <Container obj={obj} assetId={def.assetId} view={view} fx={fx ?? { gas: 0, precip: 0, flame: 0, sparks: 0, steam: 0, smoke: 0, flash: 0 }} quality={quality} />;
  switch (def.geometry) {
    case "bottle":
      return <Bottle obj={obj} />;
    case "burner":
    case "hot-plate":
      return <Burner obj={obj} />;
    case "steel-wool-pad":
      return <SteelWoolPad />;
    case "thermometer":
      return <Thermometer />;
    default:
      return <SimpleEquipment type={def.geometry} />;
  }
}

export function SceneObjectView({ obj, quality }: { obj: SObj; quality: Quality }) {
  const selected = useEditor((s) => s.selection.includes(obj.id));
  const tool = useEditor((s) => s.tool);
  const readOnly = useEditor((s) => s.readOnly);
  const group = useRef<Group>(null);
  const drag = useRef<{ dx: number; dz: number; moved: boolean; startX: number; startY: number } | null>(null);
  const { gl } = useThree();
  const [tuft, setTuft] = useState<Vector3 | null>(null);
  const isPad = obj.type === "steel-wool-pad";

  // Pour animation: the source container lifts, moves over the target and tilts.
  useFrame(() => {
    if (!group.current) return;
    const pose = pourPose(obj.id);
    if (pose) {
      group.current.position.set(pose.position[0], pose.position[1], pose.position[2]);
      group.current.rotation.set(0, obj.rotation[1], 0);
      group.current.rotateOnWorldAxis(new Vector3(pose.axis[0], 0, pose.axis[2]), pose.tilt);
    } else {
      group.current.position.set(obj.position[0], obj.position[1], obj.position[2]);
      group.current.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
    }
  });

  useEffect(() => {
    if (!tuft) return;
    const up = () => {
      const s = useEditor.getState();
      const target = s.doc.objects.find((o) => CONTAINER_TYPES.has(o.type) && Math.hypot(o.position[0] - tuft.x, o.position[2] - tuft.z) < 0.45);
      if (target) {
        s.chemOp({ kind: "add", containerId: target.id, substanceId: "steel-wool", massG: 0.5 }, { kind: "tuft", fromId: obj.id, toId: target.id, color: "#9aa0a8", substanceId: "steel-wool" });
        sfx.place();
      }
      setTuft(null);
      s.setDragging(false);
    };
    window.addEventListener("pointerup", up, { once: true });
    return () => window.removeEventListener("pointerup", up);
  }, [tuft, obj.id]);

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (tool !== "select") return;
    e.stopPropagation();
    const s = useEditor.getState();
    s.select(obj.id, e.shiftKey || e.metaKey || e.ctrlKey);
    if (readOnly) return;
    if (isPad && !e.shiftKey) {
      // Pull a tuft of steel wool off the pad.
      s.setDragging(true);
      e.ray.intersectPlane(floor, hit);
      setTuft(hit.clone());
      return;
    }
    e.ray.intersectPlane(floor, hit);
    drag.current = { dx: obj.position[0] - hit.x, dz: obj.position[2] - hit.z, moved: false, startX: e.clientX, startY: e.clientY };
    try {
      gl.domElement.setPointerCapture?.(e.pointerId);
    } catch {
      /* synthetic or already-captured pointer */
    }
    s.checkpoint();
    s.setDragging(true);
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (tuft) {
      e.ray.intersectPlane(floor, hit);
      setTuft(hit.clone());
      return;
    }
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 4) return;
    d.moved = true;
    e.ray.intersectPlane(floor, hit);
    const s = useEditor.getState();
    let x = hit.x + d.dx;
    let z = hit.z + d.dz;
    if (s.snap) {
      x = Math.round(x * 8) / 8;
      z = Math.round(z * 8) / 8;
    }
    [x, z] = clampToTable(x, z);
    let y = 0;
    if (CONTAINER_TYPES.has(obj.type)) {
      // Containers snap onto a burner's gauze or a hot plate when dropped close to it.
      const heater = s.doc.objects.find((o) => (o.type === "bunsen-burner" || o.type === "hot-plate") && Math.hypot(o.position[0] - x, o.position[2] - z) < 0.22);
      if (heater) {
        x = heater.position[0];
        z = heater.position[2];
        y = heater.type === "bunsen-burner" ? 0.45 : 0.165;
      }
    }
    s.moveObject(obj.id, [x, y, z]);
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    drag.current = null;
    try {
      gl.domElement.releasePointerCapture?.(e.pointerId);
    } catch {
      /* capture may already be released (e.g. pointer cancelled) */
    }
    useEditor.getState().setDragging(false);
    if (d?.moved) sfx.place();
    else if (d) {
      // A click without movement: discard the checkpoint we pushed.
      const s = useEditor.getState();
      useEditor.setState({ past: s.past.slice(0, -1) });
    }
  };
  const onDouble = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (readOnly) return;
    const s = useEditor.getState();
    if (obj.type === "switch" || obj.type === "push-button") {
      const v = !(obj.props.closed === true);
      s.setProp(obj.id, "closed", v);
      sfx.switchToggle(v);
    } else if (obj.type === "bunsen-burner" || obj.type === "hot-plate") {
      const v = !(obj.props.lit !== false);
      s.setProp(obj.id, "lit", v);
      if (v) sfx.ignite();
    }
  };

  const def = getComponentDef(obj.type);
  if (!def) return null;
  return (
    <>
      <group ref={group} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onDoubleClick={onDouble} scale={obj.scale}>
        <Model obj={obj} quality={quality} />
        {def.terminals.length > 0 && <Terminals obj={obj} />}
        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
            <ringGeometry args={[0.42, 0.46, 48]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.85} toneMapped={false} />
          </mesh>
        )}
      </group>
      {tuft && <SteelWoolTuft position={[tuft.x, 0.35, tuft.z]} scale={1.1} />}
    </>
  );
}
