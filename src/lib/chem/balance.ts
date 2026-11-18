import { parseFormula } from "./formula";

/**
 * Find the smallest positive integer coefficients that balance a reaction.
 * Exhaustive search over 1..maxCoeff is fast for school reactions (≤ 6 species).
 */
export function balance(reactants: string[], products: string[], maxCoeff = 10): { r: number[]; p: number[] } | null {
  const species = [...reactants, ...products].map((f) => parseFormula(f));
  const elements = [...new Set(species.flatMap((s) => Object.keys(s)))];
  const n = species.length;
  const coeffs = new Array(n).fill(1);
  const check = () =>
    elements.every((el) => {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += (i < reactants.length ? 1 : -1) * coeffs[i]! * (species[i]![el] ?? 0);
      return sum === 0;
    });
  // Odometer over coefficient vectors, ordered by total size so the first hit is minimal.
  for (let total = n; total <= n * maxCoeff; total++) {
    const found = search(0, total);
    if (found) return { r: coeffs.slice(0, reactants.length), p: coeffs.slice(reactants.length) };
  }
  return null;

  function search(i: number, remaining: number): boolean {
    if (i === n - 1) {
      if (remaining < 1 || remaining > maxCoeff) return false;
      coeffs[i] = remaining;
      return check();
    }
    for (let c = 1; c <= Math.min(maxCoeff, remaining - (n - 1 - i)); c++) {
      coeffs[i] = c;
      if (search(i + 1, remaining - c)) return true;
    }
    return false;
  }
}
