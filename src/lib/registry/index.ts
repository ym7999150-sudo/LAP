import { CHEMISTRY_COMPONENTS } from "./chemistry";
import { PHYSICS_COMPONENTS } from "./physics";
import type { ComponentDef, Lab } from "./types";

export * from "./types";

/**
 * Real 3D models (public/models/manifest.json) mapped to components. Only models that genuinely
 * match the component are listed; everything else uses its procedural model.
 */
export const ASSET_MAP: Record<string, string> = {
  battery: "pp-aa-battery",
  "battery-large": "pp-d-battery",
  generator: "pp-generator",
  fan: "pp-desk-fan",
  bulb: "ph-lightbulb",
  switch: "pp-lever-switch",
  "push-button": "pp-push-button",
  fuse: "pp-cartridge-fuse",
  "npn-transistor": "pp-transistor",
  "op-amp": "pp-dip-ic",
  potentiometer: "pp-dial-knob",
  ammeter: "ph-analog-meter",
  voltmeter: "ph-analog-meter",
  ohmmeter: "ph-analog-meter",
  multimeter: "pp-digital-multimeter",
  oscilloscope: "pp-oscilloscope",
  compass: "ph-compass",
  "beaker-250": "ph-beaker-250",
  "measuring-cylinder": "ph-beaker-large",
  "beaker-100": "ph-beaker-small",
  "test-tube": "ph-test-tube",
  "conical-flask": "pp-conical-flask",
  crucible: "pp-porcelain-bowl",
  "reagent-bottle": "ph-reagent-bottle",
  "bunsen-burner": "ph-bunsen-burner",
  "hot-plate": "pp-hot-plate",
  thermometer: "pp-thermometer",
  balance: "pp-digital-scale",
  dropper: "ph-dropper-bottle",
  funnel: "pp-funnel",
  "test-tube-rack": "ph-test-tube-rack",
  "lab-stand": "ph-clamp-stand",
  goggles: "pp-safety-glasses",
};

/** Central component registry. Add new components to the lists above — the editor reads everything from here. */
export const COMPONENTS: ComponentDef[] = [...PHYSICS_COMPONENTS, ...CHEMISTRY_COMPONENTS].map((c) => (ASSET_MAP[c.type] ? { ...c, assetId: ASSET_MAP[c.type] } : c));

const byType = new Map(COMPONENTS.map((c) => [c.type, c]));

export function getComponentDef(type: string): ComponentDef | undefined {
  return byType.get(type);
}

export function componentsForLab(lab: Lab): ComponentDef[] {
  return COMPONENTS.filter((c) => c.lab === lab);
}

export function defaultProps(def: ComponentDef): Record<string, number | boolean | string> {
  const out: Record<string, number | boolean | string> = {};
  for (const p of def.props) out[p.key] = p.default;
  return out;
}

export const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  power: { en: "Power sources", ar: "مصادر الطاقة" },
  passive: { en: "Passive components", ar: "عناصر سلبية" },
  switching: { en: "Switches & relays", ar: "المفاتيح والمرحلات" },
  protection: { en: "Protection", ar: "الحماية" },
  semiconductor: { en: "Semiconductors", ar: "أشباه الموصلات" },
  loads: { en: "Loads & outputs", ar: "الأحمال والمخرجات" },
  magnetism: { en: "Magnetism", ar: "المغناطيسية" },
  measurement: { en: "Measurement", ar: "أجهزة القياس" },
  connection: { en: "Connections", ar: "التوصيلات" },
  materials: { en: "Materials", ar: "المواد" },
  glassware: { en: "Glassware", ar: "الأدوات الزجاجية" },
  reagents: { en: "Reagents", ar: "الكواشف" },
  heating: { en: "Heating", ar: "التسخين" },
  transfer: { en: "Transfer tools", ar: "أدوات النقل" },
  support: { en: "Supports", ar: "الحوامل" },
  safety: { en: "Safety", ar: "السلامة" },
};
