"use client";
import { Eye, FlaskConical, Zap } from "lucide-react";
import Link from "next/link";
import { Empty, Page, Skeleton } from "@/components/ui/Page";
import { useApi } from "@/lib/client/useApi";
import { useI18n } from "@/lib/i18n/client";

interface Row {
  token: string;
  title: string;
  lab: string;
  owner: string;
  tag: string;
  views: number;
  updatedAt: string;
}

export default function Shared() {
  const { t } = useI18n();
  const { data, loading } = useApi<{ projects: Row[] }>("/api/shared");
  return (
    <Page title={t("nav_shared")}>
      {loading ? (
        <Skeleton rows={4} />
      ) : !data?.projects.length ? (
        <Empty text={t("empty_list")} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.projects.map((p) => (
            <li key={p.token}>
              <Link href={`/shared/${p.token}`} className="panel block p-4 hover:border-line-strong">
                <div className="flex items-center gap-2">
                  {p.lab === "physics" ? <Zap size={17} className="text-accent" /> : <FlaskConical size={17} className="text-chem" />}
                  <span className="flex-1 truncate font-semibold">{p.title}</span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {t("by")} {p.owner} <span className="ltr-num">#{p.tag}</span>
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-faint ltr-num">
                  <Eye size={12} /> {p.views} {t("views")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
