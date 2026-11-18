"use client";
import { Empty, Page, Skeleton } from "@/components/ui/Page";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useApi } from "@/lib/client/useApi";
import { useI18n } from "@/lib/i18n/client";

interface Report {
  id: number;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
}

/** Content review queue. Access is enforced server-side (ADMIN_USER_IDS / role), never by display name. */
export default function Admin() {
  const { t, L } = useI18n();
  const { user } = useSession();
  const { data, loading, error, reload } = useApi<{ reports: Report[] }>(user ? "/api/reports" : null);
  return (
    <Page title={t("nav_admin")} subtitle={L({ en: "Review reported content errors. Catalog imports and validation run through `npm run db:seed` and the scripts documented in README.", ar: "مراجعة بلاغات أخطاء المحتوى. استيراد الكتالوج والتحقق منه يتم عبر npm run db:seed والسكربتات الموثقة في README." })}>
      {error ? (
        <Empty text="403 — admin only" />
      ) : loading ? (
        <Skeleton rows={4} />
      ) : !data?.reports.length ? (
        <Empty text={t("empty_list")} />
      ) : (
        <ul className="space-y-2">
          {data.reports.map((r) => (
            <li key={r.id} className="panel flex flex-wrap items-center gap-3 p-4 text-sm">
              <span className="chip">{r.targetType}</span>
              <span className="mono">{r.targetId}</span>
              <span className="flex-1 text-muted">{r.reason}</span>
              <button className="btn" onClick={async () => { await api("/api/reports", { method: "PATCH", body: { id: r.id, status: "resolved" } }); void reload(); }}>✓</button>
              <button className="btn btn-ghost" onClick={async () => { await api("/api/reports", { method: "PATCH", body: { id: r.id, status: "dismissed" } }); void reload(); }}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
