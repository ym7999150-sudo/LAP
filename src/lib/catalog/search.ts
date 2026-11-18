/** Server-side catalog search with pagination — the browser never downloads the whole catalog. */
import { REACTIONS } from "@/lib/chem/reactions";
import { getSubstance, SUBSTANCES } from "@/lib/chem/substances";
import { reactionEquation } from "@/lib/chem/format";
import { COMPONENTS } from "@/lib/registry";

export type CatalogKind = "components" | "substances" | "reactions";

export interface CatalogQuery {
  kind: CatalogKind;
  q?: string;
  category?: string;
  lab?: string;
  page: number;
  size: number;
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[ً-ٟ]/g, "");


export function searchCatalog(query: CatalogQuery) {
  const q = query.q ? norm(query.q.trim()) : "";
  let items: Record<string, unknown>[];
  if (query.kind === "components") {
    items = COMPONENTS.filter((c) => (!query.lab || c.lab === query.lab) && (!query.category || c.category === query.category))
      .filter((c) => !q || norm(`${c.type} ${c.name.en} ${c.name.ar} ${c.category}`).includes(q))
      .map((c) => ({ id: c.type, name: c.name, description: c.description, category: c.category, lab: c.lab, support: c.simulation.support, notes: c.simulation.notes ?? null, terminals: c.terminals.length, source: c.source, version: c.version }));
  } else if (query.kind === "substances") {
    items = SUBSTANCES.filter((s) => !query.category || s.cls === query.category)
      .filter((s) => !q || norm(`${s.id} ${s.name.en} ${s.name.ar} ${s.formula ?? ""}`).includes(q))
      .map((s) => ({ id: s.id, name: s.name, formula: s.formula, cls: s.cls, state: s.state, color: s.color, hazards: s.hazards, virtualOnly: !!s.virtualOnly, stock: !!s.stock, source: s.source }));
  } else {
    items = REACTIONS.filter((r) => !query.category || r.types.includes(query.category as never))
      .filter((r) => !q || norm(`${r.id} ${r.explanation.en} ${r.explanation.ar} ${r.reactants.concat(r.products).map((t) => `${t.id} ${getSubstance(t.id)?.name.en ?? ""} ${getSubstance(t.id)?.name.ar ?? ""}`).join(" ")}`).includes(q))
      .map((r) => ({ id: r.id, types: r.types, equation: reactionEquation(r), explanation: r.explanation, safety: r.safety, safetyNote: r.safetyNote ?? null, conditions: r.conditions, observations: r.observations, provenance: r.provenance }));
  }
  const total = items.length;
  const start = query.page * query.size;
  return { items: items.slice(start, start + query.size), total, page: query.page, size: query.size };
}
