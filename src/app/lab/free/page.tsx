"use client";
import { FlaskConical, Upload, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Page } from "@/components/ui/Page";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useI18n } from "@/lib/i18n/client";
import { parseSceneJson } from "@/lib/scene/migrate";

export default function FreeEditor() {
  const { t, L } = useI18n();
  const { user } = useSession();
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const importFile = async (f: File) => {
    const r = parseSceneJson(await f.text());
    if (!r.ok) return setErr(r.error);
    if (!user) return setErr(t("sign_in_to_save"));
    const res = await api<{ id: string }>("/api/projects", { body: { title: f.name.replace(/\.json$/i, ""), scene: r.doc } });
    router.push(`/lab/${r.doc.lab}?project=${res.id}`);
  };
  return (
    <Page title={t("nav_free")} subtitle={L({ en: "Start from an empty bench and build any experiment the simulators support.", ar: "ابدأ من طاولة فارغة وابنِ أي تجربة تدعمها المحاكيات." })}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/lab/physics" className="panel p-6 hover:border-line-strong">
          <Zap size={28} className="text-accent" />
          <h2 className="mt-3 font-semibold">{t("nav_physics")}</h2>
          <p className="mt-1 text-sm text-muted">{t("physics_card")}</p>
        </Link>
        <Link href="/lab/chemistry" className="panel p-6 hover:border-line-strong">
          <FlaskConical size={28} className="text-chem" />
          <h2 className="mt-3 font-semibold">{t("nav_chemistry")}</h2>
          <p className="mt-1 text-sm text-muted">{t("chemistry_card")}</p>
        </Link>
        <button onClick={() => file.current?.click()} className="panel p-6 text-start hover:border-line-strong">
          <Upload size={28} className="text-warn" />
          <h2 className="mt-3 font-semibold">{t("import")}</h2>
          <p className="mt-1 text-sm text-muted">.labverse.json</p>
        </button>
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && void importFile(e.target.files[0])} />
      </div>
      {err && <p className="mt-4 text-sm text-danger">{err}</p>}
    </Page>
  );
}
