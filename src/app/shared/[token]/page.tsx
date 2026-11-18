"use client";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { Empty, Page, Skeleton } from "@/components/ui/Page";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useApi } from "@/lib/client/useApi";
import { useI18n } from "@/lib/i18n/client";

const LabEditor = dynamic(() => import("@/components/lab/LabEditor").then((m) => m.LabEditor), { ssr: false });

export default function SharedProject() {
  const { token } = useParams<{ token: string }>();
  const { t } = useI18n();
  const { user } = useSession();
  const router = useRouter();
  const { data, loading, error } = useApi<{ project: { title: string; lab: "physics" | "chemistry"; scene: unknown; owner: string } }>(`/api/shared/${token}`);
  if (loading) return <Page title={t("loading")}><Skeleton rows={3} /></Page>;
  if (error || !data) return <Page title={t("page_not_found")}><Empty text={t("page_not_found")} /></Page>;
  const p = data.project;
  return (
    <>
      <LabEditor lab={p.lab} shared={{ title: p.title, scene: p.scene, owner: p.owner }} />
      {user && (
        <button
          className="btn btn-primary fixed bottom-20 start-1/2 z-40 -translate-x-1/2 rtl:translate-x-1/2"
          onClick={async () => {
            const r = await api<{ id: string }>("/api/projects", { body: { title: `${p.title}`, scene: p.scene } });
            router.push(`/lab/${p.lab}?project=${r.id}`);
          }}
        >
          {t("copy_to_my_projects")}
        </button>
      )}
    </>
  );
}
