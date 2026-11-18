export type Lab = "physics" | "chemistry";

/** How faithfully a component is simulated. Displayed to users in the UI. */
export type SimulationSupport =
  | "full" // Real calculation within documented model
  | "simplified" // Real calculation with a stated simplification (e.g. DC steady state)
  | "visual-only" // Placeable 3D object, no simulation behaviour
  | "not-simulated"; // In catalog, solver reports it as unsupported

export type Vec3 = [number, number, number];

export interface TerminalDef {
  id: string;
  label: { en: string; ar: string };
  /** Position in the object's local space (metres-ish scene units). */
  local: Vec3;
  polarity?: "+" | "-";
}

export type PropDef =
  | {
      key: string;
      kind: "number";
      label: { en: string; ar: string };
      unit?: string;
      min: number;
      max: number;
      step: number;
      default: number;
    }
  | { key: string; kind: "boolean"; label: { en: string; ar: string }; default: boolean }
  | {
      key: string;
      kind: "select";
      label: { en: string; ar: string };
      options: { value: string; label: { en: string; ar: string } }[];
      default: string;
    };

export interface ComponentDef {
  /** Stable identifier, stored in scene documents. Never rename. */
  type: string;
  lab: Lab;
  category: string;
  subcategory?: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  /** Key into the procedural geometry library / GLB asset manifest. */
  geometry: string;
  /** Optional GLB asset id from public/models/manifest.json. */
  assetId?: string;
  terminals: TerminalDef[];
  props: PropDef[];
  simulation: { model: string; support: SimulationSupport; notes?: { en: string; ar: string } };
  safety?: { en: string; ar: string };
  source: string;
  version: number;
}
