"use client";
import { useState } from "react";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { Page } from "@/components/ui/Page";
import { useI18n } from "@/lib/i18n/client";

export default function SubstancesLibrary() {
  const { t, L } = useI18n();
  const [tab, setTab] = useState<"substances" | "reactions">("substances");
  return (
    <Page
      title={t("nav_substances")}
      subtitle={L({ en: "A curated, validated starter set. Combinations without validated data are reported as unsupported — never invented.", ar: "مجموعة أولية منتقاة وموثقة. أي مزيج بلا بيانات موثقة يُعلن أنه غير مدعوم — ولا يتم اختلاق نتائج." })}
      actions={
        <div className="flex gap-1 rounded-xl border border-line p-1">
          {(["substances", "reactions"] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === k ? "bg-accent/15 text-accent" : "text-muted"}`}>
              {k === "substances" ? t("nav_substances") : t("equation")}
            </button>
          ))}
        </div>
      }
    >
      <CatalogBrowser key={tab} kind={tab} />
    </Page>
  );
}
