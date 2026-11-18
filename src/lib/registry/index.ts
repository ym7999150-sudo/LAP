import { CHEMISTRY_COMPONENTS } from "./chemistry";
import { PHYSICS_COMPONENTS } from "./physics";
import type { ComponentDef, Lab } from "./types";

export * from "./types";

/** Central component registry. Add new components to the lists above — the editor reads everything from here. */
export const COMPONENTS: ComponentDef[] = [...PHYSICS_COMPONENTS, ...CHEMISTRY_COMPONENTS];

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
