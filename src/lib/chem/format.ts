import { prettyFormula } from "./formula";
import type { ReactionDef } from "./reactions";
import { getSubstance } from "./substances";

const STATE_SUFFIX: Record<string, string> = { s: "(s)", l: "(l)", g: "(g)", aq: "(aq)" };

export function reactionEquation(r: ReactionDef, withStates = true) {
  const side = (ts: ReactionDef["reactants"]) =>
    ts
      .map((t) => {
        const s = getSubstance(t.id);
        const f = prettyFormula(s?.formula ?? t.id);
        const st = withStates && s ? STATE_SUFFIX[s.id === "water" ? "l" : s.state] ?? "" : "";
        return `${t.coeff > 1 ? t.coeff : ""}${f}${st}`;
      })
      .join(" + ");
  const cond = r.conditions.catalyst ? ` —${prettyFormula(getSubstance(r.conditions.catalyst)?.formula ?? "")}→ ` : r.conditions.minTempC ? " —Δ→ " : " → ";
  return `${side(r.reactants)}${cond}${side(r.products)}`;
}
