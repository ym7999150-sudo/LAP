import { describe, expect, it } from "vitest";
import { emptyScene, type ChemOp } from "@/lib/scene/schema";
import { replayChemistry } from "./engine";
import { parseFormula } from "./formula";
import { heatOutcome, pairOutcome, waterOutcome } from "./generic";
import { solubility } from "./ions";
import type { ReactionDef } from "./reactions";
import { getSubstance, STOCK_REAGENTS } from "./substances";

function atoms(terms: ReactionDef["reactants"]) {
  const tot: Record<string, number> = {};
  for (const t of terms) for (const [el, n] of Object.entries(parseFormula(getSubstance(t.id)!.formula!))) tot[el] = (tot[el] ?? 0) + n * t.coeff;
  return tot;
}

function mix(ops: ChemOp[]) {
  const doc = emptyScene("chemistry");
  doc.objects.push({ id: "A", type: "beaker-250", position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], props: { capacity: 250 } });
  doc.chemistry.operations = ops;
  return replayChemistry(doc);
}
const add = (substanceId: string, extra: Partial<Extract<ChemOp, { kind: "add" }>> = {}): ChemOp => ({ kind: "add", containerId: "A", substanceId, ...extra });

describe("every combination has a defined outcome", () => {
  const ids = STOCK_REAGENTS.filter((s) => s.formula).map((s) => s.id);

  it("every pair of stock reagents yields a reaction or a stated no-reaction, and reactions balance", () => {
    let reactions = 0;
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const o = pairOutcome(ids[i]!, ids[j]!);
        if (o.kind === "none") {
          expect(o.explanation.en.length, `${ids[i]}+${ids[j]}`).toBeGreaterThan(10);
          expect(o.explanation.ar.length).toBeGreaterThan(5);
        } else {
          reactions++;
          expect(atoms(o.def.products), `${o.def.id} unbalanced`).toEqual(atoms(o.def.reactants));
          for (const t of [...o.def.reactants, ...o.def.products]) expect(getSubstance(t.id), `${o.def.id}: ${t.id}`).toBeDefined();
        }
      }
    expect(reactions).toBeGreaterThan(150);
  });

  it("water and heat outcomes are always balanced", () => {
    for (const id of ids) {
      const w = waterOutcome(id);
      if (w?.kind === "reaction") expect(atoms(w.def.products)).toEqual(atoms(w.def.reactants));
      const h = heatOutcome(id);
      if (h?.outcome.kind === "reaction") expect(atoms(h.outcome.def.products)).toEqual(atoms(h.outcome.def.reactants));
    }
  });

  it("a replay never reports an unsupported combination", () => {
    const sample = ["hcl", "naoh", "cuso4", "agno3", "ki", "zn", "hg", "na2co3", "bacl2", "glucose", "nh4cl", "al", "caoh2", "phenolphthalein"];
    const res = mix(sample.map((id) => add(id, { volumeMl: 5 })));
    expect(res.events.filter((e) => e.kind === "unsupported")).toHaveLength(0);
    expect(res.reactionsObserved.length).toBeGreaterThan(3);
  });
});

describe("specific rule-based reactions", () => {
  it("generic neutralisation (KOH + HCl) gives KCl and warms the solution", () => {
    const r = mix([add("hcl", { volumeMl: 20, concentration: 1 }), add("koh", { volumeMl: 20, concentration: 1 })]);
    expect(r.containers.A!.dissolved.find((d) => d.id === "ion:K:Cl")!.mol).toBeCloseTo(0.02, 6);
    expect(r.containers.A!.pH).toBe(7);
    expect(r.containers.A!.tempC).toBeGreaterThan(25);
  });

  it("silver nitrate + potassium iodide → yellow silver iodide precipitate", () => {
    const r = mix([add("agno3", { volumeMl: 10, concentration: 0.1 }), add("ki", { volumeMl: 10, concentration: 0.2 })]);
    const agi = r.containers.A!.solids.find((s) => s.id === "ion:Ag:I");
    expect(agi?.mol).toBeCloseTo(0.001, 6);
    expect(solubility("Ag", "I").color).toBe("#f2dc6b");
  });

  it("barium chloride + sulfuric acid → barium sulfate", () => {
    const o = pairOutcome("bacl2", "h2so4");
    expect(o.kind).toBe("reaction");
    if (o.kind === "reaction") expect(o.def.observations.precipitate).toBe("baso4");
  });

  it("mercury: displaces silver but not hydrogen", () => {
    const disp = pairOutcome("hg", "agno3");
    expect(disp.kind).toBe("reaction");
    if (disp.kind === "reaction") expect(disp.def.products.map((p) => p.id)).toEqual(["hgno32", "ag"]);
    expect(pairOutcome("hg", "hcl").kind).toBe("none");
  });

  it("reactive metals and basic oxides react with water", () => {
    const k = mix([add("water", { volumeMl: 50 }), add("k", { massG: 0.39 })]);
    expect(k.containers.A!.mol["koh"]).toBeCloseTo(0.39 / 39.098, 4);
    expect(k.containers.A!.pH!).toBeGreaterThan(12);
    const lime = mix([add("water", { volumeMl: 50 }), add("cao", { massG: 0.56 })]);
    expect(lime.containers.A!.mol["caoh2"]).toBeCloseTo(0.01, 3);
    expect(waterOutcome("cu")!.kind).toBe("none");
  });

  it("ammonium chloride + sodium hydroxide releases ammonia", () => {
    const o = pairOutcome("nh4cl", "naoh");
    expect(o.kind === "reaction" && o.def.observations.gas).toBe("nh3");
  });

  it("aluminium displaces copper; copper does not displace zinc", () => {
    const o = pairOutcome("al", "cucl2");
    expect(o.kind === "reaction" && o.def.observations.deposit).toBe("cu");
    expect(pairOutcome("cu", "znso4").kind).toBe("none");
  });

  it("soluble-only swaps are a stated no-reaction", () => {
    const o = pairOutcome("kno3", "mgcl2");
    expect(o.kind).toBe("none");
    if (o.kind === "none") expect(o.explanation.en).toMatch(/soluble/);
  });

  it("thermal decomposition of zinc carbonate needs enough heat", () => {
    expect(heatOutcome("ion:Zn:CO3")!.minTempC).toBe(250);
    expect(heatOutcome("caco3")!.minTempC).toBe(840);
  });
});
