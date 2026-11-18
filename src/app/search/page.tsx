"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { Page } from "@/components/ui/Page";
import { EXPERIMENTS } from "@/lib/curriculum/experiments";
import { experimentHref } from "@/lib/curriculum/links";
import { useI18n } from "@/lib/i18n/client";

function Results() {
  const { t, L } = useI18n();
  const q = useSearchParams().get("q") ?? "";
  const norm = q.toLowerCase();
  const exps = EXPERIMENTS.filter((e) => `${e.title.en} ${e.title.ar} ${e.objective.en} ${e.objective.ar}`.toLowerCase().includes(norm));
  return (
    <Page title={`${t("search")}: ${q}`}>
      {exps.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold">{t("nav_experiments")}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {exps.map((e) => (
              <Link key={e.id} href={experimentHref(e)} className="panel p-3 hover:border-line-strong">{L(e.title)}</Link>
            ))}
          </div>
        </section>
      )}
      <section className="mb-8">
        <h2 className="mb-3 font-semibold">{t("nav_components")}</h2>
        <CatalogBrowser kind="components" initialQ={q} categories={[]} />
      </section>
      <section className="mb-8">
        <h2 className="mb-3 font-semibold">{t("nav_substances")}</h2>
        <CatalogBrowser kind="substances" initialQ={q} />
      </section>
    </Page>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <Results />
    </Suspense>
  );
}
