/** Server-only quiz answer key: experimentId → questionId → correct option index. Never import from client components. */
export const ANSWERS: Record<string, Record<string, number>> = {
  "closed-circuit": { q1: 1 },
  "conductors-insulators": { q1: 2 },
  "measure-v-i": { q1: 1 },
  "ohms-law": { q1: 1, q2: 0 },
  "series-circuit": { q1: 0 },
  "parallel-circuit": { q1: 1 },
  "electric-power": { q1: 1 },
  electromagnet: { q1: 1 },
  "neutralization-indicator": { q1: 0 },
  "acid-metal": { q1: 2 },
  precipitation: { q1: 0 },
  "thermal-decomposition": { q1: 1 },
  "steel-wool-combustion": { q1: 0 },
  "punnett-monohybrid": { q1: 0 },
  "geologic-timeline": { q1: 1 },
};
