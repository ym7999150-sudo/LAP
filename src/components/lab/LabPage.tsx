"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const LabEditor = dynamic(() => import("./LabEditor").then((m) => m.LabEditor), {
  ssr: false,
  loading: () => <div className="fixed inset-0 grid place-items-center bg-bg"><div className="skeleton h-2 w-48" /></div>,
});

/** Client entry that lazy-loads the 3D editor so other pages never download Three.js. */
export function LabPage({ lab }: { lab: "physics" | "chemistry" }) {
  const sp = useSearchParams();
  const project = sp.get("project");
  const experiment = sp.get("experiment");
  return <LabEditor key={`${lab}:${project}:${experiment}`} lab={lab} projectId={project} experimentId={experiment} />;
}
