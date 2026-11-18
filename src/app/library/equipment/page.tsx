"use client";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { Page } from "@/components/ui/Page";
import { useI18n } from "@/lib/i18n/client";

export default function EquipmentLibrary() {
  const { t, L } = useI18n();
  return (
    <Page title={t("nav_equipment")} subtitle={L({ en: "Laboratory glassware, heating, measuring and safety equipment available in the Chemistry Lab.", ar: "الأدوات الزجاجية وأدوات التسخين والقياس والسلامة المتاحة في معمل الكيمياء." })}>
      <CatalogBrowser kind="components" lab="chemistry" categories={["glassware", "reagents", "heating", "measurement", "transfer", "support", "safety"]} />
    </Page>
  );
}
