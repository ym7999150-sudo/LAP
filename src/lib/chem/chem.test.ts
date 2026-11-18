import { describe, expect, it } from "vitest";
import { emptyScene, type ChemOp, type SceneDocument } from "@/lib/scene/schema";
import { ELEMENTS, getElement } from "./elements";
import { computePH, replayChemistry } from "./engine";
import { molarMass, parseFormula } from "./formula";
import { NO_REACTIONS, REACTIONS } from "./reactions";
import { getSubstance, SUBSTANCES } from "./substances";

function lab(ops: ChemOp[], extra: SceneDocument["objects"] = []): SceneDocument {
  const doc = emptyScene("chemistry");
  const obj = (id: string, type: string, props: Record<string, number | boolean | string> = {}) => ({
    id,
    type,
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    scale: [1, 1, 1] as [number, number, number],
    props,
  });
  doc.objects.push(obj("A", "beaker-250", { capacity: 250 }), obj("B", "beaker-250", { capacity: 250 }), obj("T", "test-tube", { capacity: 20 }), ...extra);
  doc.chemistry.operations = ops;
  return doc;
}

describe("formula parsing & molar mass", () => {
  it("parses nested groups and hydrates", () => {
    expect(parseFormula("Cu(OH)2")).toEqual({ Cu: 1, O: 2, H: 2 });
    expect(parseFormula("Pb(NO3)2")).toEqual({ Pb: 1, N: 2, O: 6 });
    expect(parseFormula("CuSO4·5H2O")).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
  });
  it("computes molar masses", () => {
    expect(molarMass("H2O")).toBeCloseTo(18.015, 2);
    expect(molarMass("NaCl")).toBeCloseTo(58.44, 1);
    expect(molarMass("CaCO3")).toBeCloseTo(100.09, 1);
  });
  it("rejects invalid formulas", () => {
    expect(() => parseFormula("Xx2")).toThrow();
    expect(() => parseFormula("Cu(OH")).toThrow();
  });
});

describe("periodic table", () => {
  it("has 118 elements with consistent groups", () => {
    expect(ELEMENTS).toHaveLength(118);
    expect(getElement("Na")!.group).toBe(1);
    expect(getElement("Cl")!.group).toBe(17);
    expect(getElement("Fe")!.group).toBe(8);
    expect(getElement("Hf")!.group).toBe(4);
    expect(getElement("Og")!.group).toBe(18);
    expect(getElement("Ce")!.group).toBeNull();
    expect(new Set(ELEMENTS.map((e) => `${e.grid.row}-${e.grid.col}`)).size).toBe(118);
  });
  it("produces correct electron configurations", () => {
    expect(getElement("O")!.electronConfiguration).toBe("[He] 2s2 2p4");
    expect(getElement("Fe")!.electronConfiguration).toBe("[Ar] 3d6 4s2");
    expect(getElement("Cu")!.electronConfiguration).toBe("[Ar] 3d10 4s1");
    expect(getElement("Br")!.electronConfiguration).toBe("[Ar] 3d10 4s2 4p5");
  });
});

describe("reaction definitions", () => {
  it("every reaction is atom-balanced and references known substances", () => {
    for (const r of REACTIONS) {
      const count = (terms: typeof r.reactants) => {
        const tot: Record<string, number> = {};
        for (const t of terms) {
          const s = getSubstance(t.id);
          expect(s, `${r.id}: unknown substance ${t.id}`).toBeDefined();
          expect(s!.formula, `${r.id}: ${t.id} has no formula`).toBeTruthy();
          for (const [el, n] of Object.entries(parseFormula(s!.formula!))) tot[el] = (tot[el] ?? 0) + n * t.coeff;
        }
        return tot;
      };
      expect(count(r.products), `${r.id} is not balanced`).toEqual(count(r.reactants));
    }
  });
  it("has unique ids and valid safety classes", () => {
    expect(new Set(REACTIONS.map((r) => r.id)).size).toBe(REACTIONS.length);
    for (const r of REACTIONS) expect(["school-safe", "supervised", "virtual-only"]).toContain(r.safety);
    for (const n of NO_REACTIONS) for (const id of n.reactants) expect(getSubstance(id)).toBeDefined();
  });
  it("substances referenced as hazardous reactants are flagged virtual-only where required", () => {
    expect(REACTIONS.find((r) => r.id === "alkali-na-water")!.safety).toBe("virtual-only");
    expect(getSubstance("na")!.virtualOnly).toBe(true);
  });
  it("all substance formulas parse", () => {
    for (const s of SUBSTANCES) if (s.formula) expect(() => parseFormula(s.formula!)).not.toThrow();
  });
});

describe("engine behaviour", () => {
  it("neutralisation with stoichiometric amounts gives pH 7 and warms the solution", () => {
    const res = replayChemistry(
      lab([
        { kind: "add", containerId: "A", substanceId: "hcl", volumeMl: 50, concentration: 1 },
        { kind: "add", containerId: "A", substanceId: "naoh", volumeMl: 50, concentration: 1 },
      ]),
    );
    const a = res.containers.A!;
    expect(res.reactionsObserved).toContain("neutralization-hcl-naoh");
    expect(a.mol.hcl).toBeUndefined();
    expect(a.mol.naoh).toBeUndefined();
    expect(a.mol.nacl).toBeCloseTo(0.05, 6);
    expect(a.pH).toBe(7);
    // ΔT = 57.6 kJ/mol × 0.05 mol / (100 g × 4.18) ≈ 6.9 K
    expect(a.tempC - 22).toBeCloseTo(6.89, 1);
  });

  it("limiting reagent leaves excess acid (pH < 7)", () => {
    const res = replayChemistry(
      lab([
        { kind: "add", containerId: "A", substanceId: "hcl", volumeMl: 50, concentration: 1 },
        { kind: "add", containerId: "A", substanceId: "naoh", volumeMl: 25, concentration: 1 },
      ]),
    );
    const a = res.containers.A!;
    expect(a.mol.hcl).toBeCloseTo(0.025, 6);
    expect(a.pH!).toBeCloseTo(-Math.log10(0.025 / 0.075), 3);
  });

  it("precipitation produces the right solid in the right amount", () => {
    const res = replayChemistry(
      lab([
        { kind: "add", containerId: "A", substanceId: "cuso4", volumeMl: 20, concentration: 0.5 },
        { kind: "add", containerId: "A", substanceId: "naoh", volumeMl: 20, concentration: 1 },
      ]),
    );
    const a = res.containers.A!;
    expect(a.solids.find((s) => s.id === "cuoh2")!.mol).toBeCloseTo(0.01, 6);
    expect(a.mol.cuso4).toBeUndefined();
  });

  it("metal + acid evolves hydrogen (gas escapes) and consumes the metal", () => {
    const res = replayChemistry(
      lab([
        { kind: "add", containerId: "A", substanceId: "hcl", volumeMl: 50, concentration: 1 },
        { kind: "add", containerId: "A", substanceId: "zn", massG: 0.6538 },
      ]),
    );
    const ev = res.events.find((e) => e.reactionId === "acid-metal-zn-hcl")!;
    expect(ev.extentMol).toBeCloseTo(0.6538 / 65.38, 5);
    expect(res.containers.A!.mol.h2).toBeUndefined();
    expect(res.containers.A!.mol.zn).toBeUndefined();
  });

  it("documented and rule-based non-reactions are reported, never invented or left undefined", () => {
    const res = replayChemistry(
      lab([
        { kind: "add", containerId: "A", substanceId: "hcl", volumeMl: 20 },
        { kind: "add", containerId: "A", substanceId: "cu", massG: 1 },
        { kind: "add", containerId: "B", substanceId: "glucose", massG: 1 },
        { kind: "add", containerId: "B", substanceId: "ki", volumeMl: 10 },
      ]),
    );
    expect(res.events.some((e) => e.kind === "no-reaction" && e.containerId === "A")).toBe(true);
    // Every combination is defined: sugar + KI is a stated "no reaction", never "unsupported".
    expect(res.events.some((e) => e.kind === "no-reaction" && e.containerId === "B")).toBe(true);
    expect(res.events.some((e) => e.kind === "unsupported")).toBe(false);
    expect(res.reactionsObserved).toHaveLength(0);
  });

  it("thermal decomposition needs a lit heat source and enough heating", () => {
    const burner = { id: "H", type: "bunsen-burner", position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number], props: { lit: true } };
    const ops: ChemOp[] = [
      { kind: "add", containerId: "T", substanceId: "cuco3", massG: 1 },
      { kind: "heat", containerId: "T", seconds: 30 },
    ];
    const noBurner = replayChemistry(lab(ops));
    expect(noBurner.events.some((e) => e.kind === "no-heat-source")).toBe(true);
    expect(noBurner.reactionsObserved).toHaveLength(0);
    const ok = replayChemistry(lab(ops, [burner]));
    expect(ok.reactionsObserved).toContain("decomp-cuco3-heat");
    expect(ok.containers.T!.solids.map((s) => s.id)).toContain("cuo");
  });

  it("catalyst is required and not consumed", () => {
    const without = replayChemistry(lab([{ kind: "add", containerId: "A", substanceId: "h2o2", volumeMl: 20 }]));
    expect(without.reactionsObserved).toHaveLength(0);
    const withCat = replayChemistry(
      lab([
        { kind: "add", containerId: "A", substanceId: "h2o2", volumeMl: 20 },
        { kind: "add", containerId: "A", substanceId: "mno2", massG: 0.2 },
      ]),
    );
    expect(withCat.reactionsObserved).toContain("decomp-h2o2-mno2");
    expect(withCat.containers.A!.mol.mno2).toBeCloseTo(0.2 / molarMass("MnO2"), 6);
  });

  it("pouring transfers a proportional share and triggers reactions in the target", () => {
    const res = replayChemistry(
      lab([
        { kind: "add", containerId: "A", substanceId: "agno3", volumeMl: 10, concentration: 0.1 },
        { kind: "add", containerId: "B", substanceId: "nacl", volumeMl: 40, concentration: 0.5 },
        { kind: "pour", fromId: "B", toId: "A", volumeMl: 20 },
      ]),
    );
    expect(res.containers.B!.volumeMl).toBeCloseTo(20);
    expect(res.containers.A!.volumeMl).toBeCloseTo(30);
    expect(res.containers.A!.solids.find((s) => s.id === "agcl")!.mol).toBeCloseTo(0.001, 6);
  });

  it("prevents overflow and rejects invalid operations", () => {
    const res = replayChemistry(
      lab([
        { kind: "add", containerId: "T", substanceId: "water", volumeMl: 50 },
        { kind: "add", containerId: "nope", substanceId: "water", volumeMl: 5 },
        { kind: "add", containerId: "A", substanceId: "agcl", volumeMl: 5 }, // not a stock reagent
      ]),
    );
    expect(res.containers.T!.volumeMl).toBe(20);
    expect(res.events.filter((e) => e.kind === "overflow")).toHaveLength(1);
    expect(res.events.filter((e) => e.kind === "invalid")).toHaveLength(2);
  });

  it("indicators change colour with pH", () => {
    const base = replayChemistry(
      lab([
        { kind: "add", containerId: "A", substanceId: "naoh", volumeMl: 20, concentration: 0.1 },
        { kind: "add", containerId: "A", substanceId: "phenolphthalein", volumeMl: 1 },
      ]),
    );
    expect(base.containers.A!.indicatorColor).toBe("#ff2d95");
    const acid = replayChemistry(
      lab([
        { kind: "add", containerId: "A", substanceId: "hcl", volumeMl: 20, concentration: 0.1 },
        { kind: "add", containerId: "A", substanceId: "phenolphthalein", volumeMl: 1 },
      ]),
    );
    expect(acid.containers.A!.indicatorColor).toBeNull();
    expect(computePH({ id: "x", capacityMl: 100, volumeMl: 100, tempC: 22, mol: { hcl: 0.001 } }).pH).toBeCloseTo(2, 6);
  });
});
