/**
 * Dense linear solver: Gaussian elimination with partial pivoting.
 * Circuits built in the editor are small (tens to a few hundred unknowns),
 * so a dense O(n^3) solve is fast and numerically adequate.
 */
export type SolveOutcome =
  | { ok: true; x: Float64Array }
  | { ok: false; reason: "singular"; row: number };

export function solveDense(A: Float64Array[], b: Float64Array, pivotTol = 1e-14): SolveOutcome {
  const n = b.length;
  // Work on copies so callers can reuse inputs.
  const M = A.map((r) => Float64Array.from(r));
  const rhs = Float64Array.from(b);

  // Scale tolerance relative to the largest matrix entry.
  let maxAbs = 0;
  for (const row of M) for (let j = 0; j < n; j++) maxAbs = Math.max(maxAbs, Math.abs(row[j]!));
  const tol = pivotTol * Math.max(1, maxAbs);

  for (let k = 0; k < n; k++) {
    let p = k;
    let best = Math.abs(M[k]![k]!);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(M[i]![k]!);
      if (v > best) {
        best = v;
        p = i;
      }
    }
    if (best < tol) return { ok: false, reason: "singular", row: k };
    if (p !== k) {
      const tmp = M[k]!;
      M[k] = M[p]!;
      M[p] = tmp;
      const t = rhs[k]!;
      rhs[k] = rhs[p]!;
      rhs[p] = t;
    }
    const rowK = M[k]!;
    const pivot = rowK[k]!;
    for (let i = k + 1; i < n; i++) {
      const rowI = M[i]!;
      const f = rowI[k]! / pivot;
      if (f === 0) continue;
      for (let j = k; j < n; j++) rowI[j] = rowI[j]! - f * rowK[j]!;
      rhs[i] = rhs[i]! - f * rhs[k]!;
    }
  }

  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    const row = M[i]!;
    let s = rhs[i]!;
    for (let j = i + 1; j < n; j++) s -= row[j]! * x[j]!;
    x[i] = s / row[i]!;
  }
  for (let i = 0; i < n; i++) if (!Number.isFinite(x[i]!)) return { ok: false, reason: "singular", row: i };
  return { ok: true, x };
}
