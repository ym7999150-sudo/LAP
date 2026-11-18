import type { ExperimentDef } from "./experiments";

export function experimentHref(e: ExperimentDef) {
  return e.lab === "physics" || e.lab === "chemistry" ? `/lab/${e.lab}?experiment=${e.id}` : `/experiments/${e.id}`;
}
