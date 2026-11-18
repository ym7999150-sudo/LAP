"use client";
import { create } from "zustand";
import { defaultProps, getComponentDef } from "@/lib/registry";
import { emptyScene, type ChemOp, type PropValue, type SceneDocument, type SceneObject, type Wire } from "@/lib/scene/schema";

export type Tool = "select" | "wire";
export interface Endpoint {
  objectId: string;
  terminalId: string;
}

/** A pending visual effect (pour stream, reagent drop, steel-wool tuft) played by the 3D scene. */
export interface FxRequest {
  id: number;
  kind: "pour" | "add-liquid" | "add-solid" | "tuft";
  fromId?: string;
  toId: string;
  color: string;
  substanceId?: string;
  startedAt: number;
}

interface EditorState {
  doc: SceneDocument;
  selection: string[];
  selectedWire: string | null;
  tool: Tool;
  snap: boolean;
  running: boolean;
  past: SceneDocument[];
  future: SceneDocument[];
  draft: { from: Endpoint; point: [number, number, number] } | null;
  hoverTerminal: Endpoint | null;
  dragging: boolean;
  dirty: boolean;
  fx: FxRequest[];
  wireColor: string;
  readOnly: boolean;

  load: (doc: SceneDocument, opts?: { readOnly?: boolean }) => void;
  reset: (lab: "physics" | "chemistry") => void;
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;
  select: (id: string | null, additive?: boolean) => void;
  selectWire: (id: string | null) => void;
  setTool: (t: Tool) => void;
  toggleSnap: () => void;
  setRunning: (r: boolean) => void;
  addObject: (type: string, position?: [number, number, number], props?: Record<string, PropValue>) => string | null;
  moveObject: (id: string, position: [number, number, number]) => void;
  rotateSelected: () => void;
  setProp: (id: string, key: string, value: PropValue) => void;
  setScale: (id: string, s: number) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  startWire: (from: Endpoint, point: [number, number, number]) => void;
  moveDraft: (point: [number, number, number]) => void;
  setHoverTerminal: (e: Endpoint | null) => void;
  finishWire: (to: Endpoint | null) => "connected" | "cancelled" | "invalid";
  setWireColor: (c: string) => void;
  setDragging: (d: boolean) => void;
  chemOp: (op: ChemOp, fx?: Omit<FxRequest, "id" | "startedAt">) => void;
  clearFx: (id: number) => void;
  markSaved: () => void;
}

let uid = 0;
const newId = (p: string) => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;
let fxId = 0;
export const FX_APPLY_DELAY_MS = 860;

const clone = (d: SceneDocument): SceneDocument => structuredClone(d);

export const useEditor = create<EditorState>((set, get) => {
  const mutate = (fn: (d: SceneDocument) => void, history = true) => {
    const s = get();
    if (s.readOnly) return;
    const next = clone(s.doc);
    fn(next);
    set({
      doc: next,
      past: history ? [...s.past.slice(-99), s.doc] : s.past,
      future: history ? [] : s.future,
      dirty: true,
    });
  };

  return {
    doc: emptyScene("physics"),
    selection: [],
    selectedWire: null,
    tool: "select",
    snap: true,
    running: true,
    past: [],
    future: [],
    draft: null,
    hoverTerminal: null,
    dragging: false,
    dirty: false,
    fx: [],
    wireColor: "#e11d48",
    readOnly: false,

    load: (doc, opts) => set({ doc: clone(doc), past: [], future: [], selection: [], selectedWire: null, dirty: false, fx: [], readOnly: !!opts?.readOnly, draft: null }),
    reset: (lab) => set({ doc: emptyScene(lab), past: [], future: [], selection: [], selectedWire: null, dirty: false, fx: [], readOnly: false }),
    checkpoint: () => {
      const s = get();
      set({ past: [...s.past.slice(-99), clone(s.doc)], future: [] });
    },
    undo: () => {
      const s = get();
      const prev = s.past[s.past.length - 1];
      if (!prev || s.readOnly) return;
      set({ doc: prev, past: s.past.slice(0, -1), future: [s.doc, ...s.future], dirty: true, selection: s.selection.filter((id) => prev.objects.some((o) => o.id === id)) });
    },
    redo: () => {
      const s = get();
      const next = s.future[0];
      if (!next || s.readOnly) return;
      set({ doc: next, past: [...s.past, s.doc], future: s.future.slice(1), dirty: true });
    },
    select: (id, additive) =>
      set((s) => ({
        selectedWire: null,
        selection: id === null ? [] : additive ? (s.selection.includes(id) ? s.selection.filter((x) => x !== id) : [...s.selection, id]) : [id],
      })),
    selectWire: (id) => set({ selectedWire: id, selection: [] }),
    setTool: (tool) => set({ tool, draft: null }),
    toggleSnap: () => set((s) => ({ snap: !s.snap })),
    setRunning: (running) => set({ running }),

    addObject: (type, position, props) => {
      const def = getComponentDef(type);
      if (!def) return null;
      const s = get();
      const id = newId(type.slice(0, 3));
      // Find a free spot near the centre of the table.
      let pos: [number, number, number] = position ?? [0, 0, 0];
      if (!position) {
        for (let r = 0; r < 40; r++) {
          const a = r * 2.4;
          const rad = 0.35 * Math.sqrt(r);
          const cand: [number, number, number] = [Math.round(Math.cos(a) * rad * 4) / 4, 0, Math.round(Math.sin(a) * rad * 4) / 4];
          if (!s.doc.objects.some((o) => Math.hypot(o.position[0] - cand[0], o.position[2] - cand[2]) < 0.7)) {
            pos = cand;
            break;
          }
        }
      }
      const obj: SceneObject = { id, type, position: pos, rotation: [0, 0, 0], scale: [1, 1, 1], props: { ...defaultProps(def), ...(props ?? {}) } };
      mutate((d) => void d.objects.push(obj));
      set({ selection: [id], selectedWire: null });
      return id;
    },
    moveObject: (id, position) => mutate((d) => {
      const o = d.objects.find((x) => x.id === id);
      if (o) o.position = position;
    }, false),
    rotateSelected: () => {
      const sel = get().selection;
      if (!sel.length) return;
      mutate((d) => {
        for (const o of d.objects) if (sel.includes(o.id)) o.rotation = [0, (o.rotation[1] + Math.PI / 2) % (Math.PI * 2), 0];
      });
    },
    setProp: (id, key, value) =>
      mutate((d) => {
        const o = d.objects.find((x) => x.id === id);
        if (o) o.props[key] = value;
      }),
    setScale: (id, sc) =>
      mutate((d) => {
        const o = d.objects.find((x) => x.id === id);
        const v = Math.min(2, Math.max(0.5, sc));
        if (o) o.scale = [v, v, v];
      }),
    deleteSelected: () => {
      const { selection, selectedWire } = get();
      if (selectedWire) {
        mutate((d) => void (d.wires = d.wires.filter((w) => w.id !== selectedWire)));
        set({ selectedWire: null });
        return;
      }
      if (!selection.length) return;
      mutate((d) => {
        d.objects = d.objects.filter((o) => !selection.includes(o.id));
        d.wires = d.wires.filter((w) => !selection.includes(w.from.objectId) && !selection.includes(w.to.objectId));
        d.chemistry.operations = d.chemistry.operations.filter((op) =>
          op.kind === "pour" ? !selection.includes(op.fromId) && !selection.includes(op.toId) : !selection.includes(op.containerId),
        );
      });
      set({ selection: [] });
    },
    duplicateSelected: () => {
      const { selection, doc } = get();
      const ids: string[] = [];
      mutate((d) => {
        for (const o of doc.objects.filter((x) => selection.includes(x.id))) {
          const id = newId(o.type.slice(0, 3));
          ids.push(id);
          d.objects.push({ ...structuredClone(o), id, position: [o.position[0] + 0.5, 0, o.position[2] + 0.5] });
        }
      });
      set({ selection: ids });
    },

    startWire: (from, point) => set({ draft: { from, point }, selection: [], selectedWire: null }),
    moveDraft: (point) => set((s) => (s.draft ? { draft: { ...s.draft, point } } : {})),
    setHoverTerminal: (hoverTerminal) => set({ hoverTerminal }),
    finishWire: (to) => {
      const { draft, doc, wireColor } = get();
      set({ draft: null });
      if (!draft || !to) return "cancelled";
      if (draft.from.objectId === to.objectId && draft.from.terminalId === to.terminalId) return "cancelled";
      const dup = doc.wires.some(
        (w) =>
          (w.from.objectId === draft.from.objectId && w.from.terminalId === draft.from.terminalId && w.to.objectId === to.objectId && w.to.terminalId === to.terminalId) ||
          (w.to.objectId === draft.from.objectId && w.to.terminalId === draft.from.terminalId && w.from.objectId === to.objectId && w.from.terminalId === to.terminalId),
      );
      if (dup) return "invalid";
      const wire: Wire = { id: newId("w"), from: draft.from, to, color: wireColor };
      mutate((d) => void d.wires.push(wire));
      return "connected";
    },
    setWireColor: (c) => {
      set({ wireColor: c });
      const w = get().selectedWire;
      if (w) mutate((d) => {
        const x = d.wires.find((y) => y.id === w);
        if (x) x.color = c;
      });
    },
    setDragging: (dragging) => set({ dragging }),
    chemOp: (op, fx) => {
      if (get().readOnly) return;
      if (!fx) {
        mutate((d) => void d.chemistry.operations.push(op));
        return;
      }
      // Start the animation now; apply the chemistry when the stream / solid reaches the vessel.
      set((s) => ({ fx: [...s.fx, { ...fx, id: ++fxId, startedAt: performance.now() }] }));
      setTimeout(() => mutate((d) => void d.chemistry.operations.push(op)), FX_APPLY_DELAY_MS);
    },
    clearFx: (id) => set((s) => ({ fx: s.fx.filter((f) => f.id !== id) })),
    markSaved: () => set({ dirty: false }),
  };
});
