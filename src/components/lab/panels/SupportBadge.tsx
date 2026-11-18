"use client";
import type { SimulationSupport } from "@/lib/registry";
import { useI18n } from "@/lib/i18n/client";

const STYLE: Record<SimulationSupport, string> = {
  full: "text-ok border-ok/40",
  simplified: "text-accent border-accent/40",
  "visual-only": "text-muted border-line-strong",
  "not-simulated": "text-warn border-warn/40",
};

export function SupportBadge({ support, small }: { support: SimulationSupport; small?: boolean }) {
  const { t } = useI18n();
  const label = support === "full" ? t("support_full") : support === "simplified" ? t("support_simplified") : support === "visual-only" ? t("support_visual") : t("support_none");
  return <span className={`chip ${STYLE[support]} ${small ? "mt-0.5 px-1.5 py-0 text-[10px]" : ""}`}>{label}</span>;
}
