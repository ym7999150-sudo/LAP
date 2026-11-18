import { Euler, Vector3 } from "three";
import { getComponentDef } from "@/lib/registry";
import type { SceneDocument, SceneObject } from "@/lib/scene/schema";

const tmp = new Vector3();
const eul = new Euler();

export function terminalWorld(o: SceneObject, terminalId: string, out = new Vector3()): Vector3 | null {
  const def = getComponentDef(o.type);
  const t = def?.terminals.find((x) => x.id === terminalId);
  if (!t) return null;
  tmp.set(t.local[0] * o.scale[0], t.local[1] * o.scale[1], t.local[2] * o.scale[2]);
  eul.set(o.rotation[0], o.rotation[1], o.rotation[2]);
  tmp.applyEuler(eul);
  return out.set(o.position[0] + tmp.x, o.position[1] + tmp.y, o.position[2] + tmp.z);
}

export function nearestTerminal(doc: SceneDocument, p: Vector3, maxDist: number, exclude?: { objectId: string; terminalId: string }) {
  let best: { objectId: string; terminalId: string; d: number } | null = null;
  const v = new Vector3();
  for (const o of doc.objects) {
    const def = getComponentDef(o.type);
    if (!def) continue;
    for (const t of def.terminals) {
      if (exclude && exclude.objectId === o.id && exclude.terminalId === t.id) continue;
      terminalWorld(o, t.id, v);
      const d = Math.hypot(v.x - p.x, v.z - p.z) + Math.abs(v.y - p.y) * 0.3;
      if (d < maxDist && (!best || d < best.d)) best = { objectId: o.id, terminalId: t.id, d };
    }
  }
  return best;
}

export const TABLE_SIZE = { w: 9, d: 6 };
export const clampToTable = (x: number, z: number): [number, number] => [
  Math.max(-TABLE_SIZE.w / 2 + 0.3, Math.min(TABLE_SIZE.w / 2 - 0.3, x)),
  Math.max(-TABLE_SIZE.d / 2 + 0.3, Math.min(TABLE_SIZE.d / 2 - 0.3, z)),
];
