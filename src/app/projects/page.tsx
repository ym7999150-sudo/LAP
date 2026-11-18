"use client";
import { Copy, FlaskConical, Pencil, Plus, Share2, Trash2, Upload, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Empty, Page, Skeleton } from "@/components/ui/Page";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useApi } from "@/lib/client/useApi";
import { useI18n } from "@/lib/i18n/client";
import { parseSceneJson } from "@/lib/scene/migrate";

interface Row {
  id: string;
  title: string;
  lab: string;
  updatedAt: string;
}

export default function Projects() {
  const { t, locale } = useI18n();
  const { user, loading } = useSession();
  const router = useRouter();
  const { data, loading: busy, reload } = useApi<{ projects: Row[] }>(user ? "/api/projects" : null);
  const [msg, setMsg] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("error_generic"));
    }
  };
  const importFile = async (f: File) => {
    const r = parseSceneJson(await f.text());
    if (!r.ok) return setMsg(r.error);
    await act(() => api("/api/projects", { body: { title: f.name.replace(/\.labverse\.json$|\.json$/i, "").slice(0, 120), scene: r.doc } }));
  };

  if (!loading && !user)
    return (
      <Page title={t("nav_projects")}>
        <Empty text={t("sign_in_to_save")} />
        <Link href="/" className="btn btn-primary mt-4">{t("welcome_enter")}</Link>
      </Page>
    );

  return (
    <Page
      title={t("nav_projects")}
      actions={
        <>
          <button className="btn" onClick={() => file.current?.click()}>
            <Upload size={16} /> {t("import")}
          </button>
          <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && void importFile(e.target.files[0])} />
          <Link className="btn" href="/lab/chemistry"><Plus size={16} /> {t("nav_chemistry")}</Link>
          <Link className="btn btn-primary" href="/lab/physics"><Plus size={16} /> {t("nav_physics")}</Link>
        </>
      }
    >
      {msg && <p className="mb-3 rounded-lg bg-danger/10 p-2 text-sm text-danger">{msg}</p>}
      {busy && !data ? (
        <Skeleton rows={4} />
      ) : !data?.projects.length ? (
        <Empty text={t("empty_list")} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.projects.map((p) => (
            <li key={p.id} className="panel flex flex-col p-4">
              <button className="flex items-center gap-2 text-start" onClick={() => router.push(`/lab/${p.lab}?project=${p.id}`)}>
                {p.lab === "physics" ? <Zap size={18} className="text-accent" /> : <FlaskConical size={18} className="text-chem" />}
                <span className="flex-1 truncate font-semibold hover:text-accent">{p.title}</span>
              </button>
              <p className="mt-1 text-xs text-faint">{new Date(p.updatedAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB")}</p>
              <div className="mt-4 flex gap-1">
                <button className="btn btn-ghost btn-icon" title={t("rename")} onClick={() => { const n = prompt(t("rename"), p.title); if (n) void act(() => api(`/api/projects/${p.id}`, { method: "PATCH", body: { title: n } })); }}>
                  <Pencil size={15} />
                </button>
                <button className="btn btn-ghost btn-icon" title={t("duplicate")} onClick={() => act(() => api(`/api/projects/${p.id}/duplicate`, { method: "POST" }))}>
                  <Copy size={15} />
                </button>
                <button className="btn btn-ghost btn-icon" title={t("share")} onClick={() => act(async () => { const r = await api<{ token: string }>(`/api/projects/${p.id}/share`, { method: "POST" }); const url = `${location.origin}/shared/${r.token}`; await navigator.clipboard?.writeText(url).catch(() => {}); setMsg(`${t("copied")}: ${url}`); })}>
                  <Share2 size={15} />
                </button>
                <span className="flex-1" />
                <button className="btn btn-ghost btn-icon text-danger" title={t("delete")} onClick={() => { if (confirm(t("confirm_delete"))) void act(() => api(`/api/projects/${p.id}`, { method: "DELETE" })); }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
