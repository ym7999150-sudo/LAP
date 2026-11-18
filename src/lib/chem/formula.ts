import { ATOMIC_MASS } from "./elements";

/** Parse a molecular formula such as "Cu(OH)2", "Pb(NO3)2" or "CuSO4·5H2O" into element counts. */
export function parseFormula(formula: string): Record<string, number> {
  const parts = formula.split(/[·.]/);
  const total: Record<string, number> = {};
  for (const raw of parts) {
    const m = raw.match(/^(\d+)(.*)$/);
    const mult = m ? Number(m[1]) : 1;
    const body = m ? m[2]! : raw;
    const counts = parseGroup(body);
    for (const [el, n] of Object.entries(counts)) total[el] = (total[el] ?? 0) + n * mult;
  }
  return total;
}

function parseGroup(s: string): Record<string, number> {
  const stack: Record<string, number>[] = [{}];
  let i = 0;
  const readNum = () => {
    let j = i;
    while (j < s.length && /\d/.test(s[j]!)) j++;
    const n = j > i ? Number(s.slice(i, j)) : 1;
    i = j;
    return n;
  };
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === "(" || ch === "[") {
      stack.push({});
      i++;
    } else if (ch === ")" || ch === "]") {
      i++;
      const n = readNum();
      const top = stack.pop();
      if (!top || stack.length === 0) throw new Error(`unbalanced parentheses in ${s}`);
      const cur = stack[stack.length - 1]!;
      for (const [el, c] of Object.entries(top)) cur[el] = (cur[el] ?? 0) + c * n;
    } else if (/[A-Z]/.test(ch)) {
      let sym = ch;
      i++;
      while (i < s.length && /[a-z]/.test(s[i]!)) sym += s[i++];
      if (!(sym in ATOMIC_MASS)) throw new Error(`unknown element ${sym} in ${s}`);
      const n = readNum();
      const cur = stack[stack.length - 1]!;
      cur[sym] = (cur[sym] ?? 0) + n;
    } else {
      throw new Error(`unexpected character '${ch}' in formula ${s}`);
    }
  }
  if (stack.length !== 1) throw new Error(`unbalanced parentheses in ${s}`);
  return stack[0]!;
}

export function molarMass(formula: string): number {
  let m = 0;
  for (const [el, n] of Object.entries(parseFormula(formula))) m += ATOMIC_MASS[el]! * n;
  return m;
}

/** Render "Cu(OH)2" with Unicode subscripts: "Cu(OH)₂". */
export function prettyFormula(formula: string): string {
  const sub = "₀₁₂₃₄₅₆₇₈₉";
  return formula.replace(/([A-Za-z)\]])(\d+)/g, (_, a: string, d: string) => a + [...d].map((c) => sub[Number(c)]).join(""));
}
