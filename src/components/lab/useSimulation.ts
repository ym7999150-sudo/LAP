"use client";
import { useEffect } from "react";
import { create } from "zustand";
import { replayChemistry, type ChemResult } from "@/lib/chem/engine";
import { simulateCircuit, type SimulationResult } from "@/lib/sim/circuit/solver";
import { useEditor } from "./store";

const EMPTY_CIRCUIT: SimulationResult = { ok: true, nodeVoltages: {}, components: {}, wires: {}, issues: [], closedCircuit: false, blownFuses: [], iterations: 0 };
const EMPTY_CHEM: ChemResult = { containers: {}, events: [], reactionsObserved: [] };

export const useSim = create<{ circuit: SimulationResult; chem: ChemResult; version: number }>(() => ({ circuit: EMPTY_CIRCUIT, chem: EMPTY_CHEM, version: 0 }));

/** Mount once per editor: runs the renderer-independent solvers whenever the scene changes. */
export function SimRunner() {
  const doc = useEditor((s) => s.doc);
  const running = useEditor((s) => s.running);
  useEffect(() => {
    const circuit = doc.lab === "physics" && running ? simulateCircuit(doc) : EMPTY_CIRCUIT;
    const chem = doc.lab === "chemistry" ? replayChemistry(doc) : EMPTY_CHEM;
    useSim.setState((s) => ({ circuit, chem, version: s.version + 1 }));
  }, [doc, running]);
  return null;
}
