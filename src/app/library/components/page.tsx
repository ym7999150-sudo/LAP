"use client";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { Page } from "@/components/ui/Page";
import { useI18n } from "@/lib/i18n/client";

export default function ComponentsLibrary() {
  const { t, L } = useI18n();
  return (
    <Page title={t("nav_components")} subtitle={L({ en: "Every component declares its real simulation capability: fully simulated, simplified model, visual only, or not simulated yet.", ar: "كل عنصر يوضح قدرته الحقيقية في المحاكاة: محاكاة كاملة، نموذج مبسط، مرئي فقط، أو غير مُحاكى بعد." })}>
      <CatalogBrowser kind="components" lab="physics" categories={["power", "passive", "switching", "protection", "semiconductor", "loads", "magnetism", "measurement", "connection", "materials"]} />
    </Page>
  );
}
