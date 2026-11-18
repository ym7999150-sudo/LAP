"use client";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { GuidedPanel } from "@/components/lab/panels/GuidedPanel";
import { PunnettSimulator } from "@/components/learn/Punnett";
import { CellExplorer } from "@/components/learn/CellExplorer";
import { BloodGroups, DnaPairing, NaturalSelectionSim } from "@/components/learn/BiologySims";
import { GeologicTimeline } from "@/components/learn/Timeline";
import { Page } from "@/components/ui/Page";
import { getExperiment, UNITS } from "@/lib/curriculum/experiments";
import { useI18n } from "@/lib/i18n/client";

export default function ExperimentPage() {
  const { id } = useParams<{ id: string }>();
  const { t, L } = useI18n();
  const exp = getExperiment(id);
  if (!exp) notFound();
  const unit = UNITS.find((u) => u.id === exp.unit);
  const inLab = exp.lab === "physics" || exp.lab === "chemistry";
  return (
    <Page title={L(exp.title)} subtitle={unit ? L(unit.title) : undefined} actions={inLab ? <Link className="btn btn-primary" href={`/lab/${exp.lab}?experiment=${exp.id}`}>{t("start")} <ArrowUpRight size={16} /></Link> : undefined}>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          {exp.id === "punnett-monohybrid" && <PunnettSimulator />}
          {exp.id === "cell-structure" && <CellExplorer />}
          {exp.id === "natural-selection" && <NaturalSelectionSim />}
          {exp.id === "blood-groups" && <BloodGroups />}
          {exp.id === "dna-pairing" && <DnaPairing />}
          {exp.lab === "earth" && <GeologicTimeline />}
          {inLab && (
            <div className="panel space-y-3 p-5 text-sm">
              <h2 className="font-semibold">{t("equipment")}</h2>
              <p className="text-muted">{exp.equipment.join(" · ")}</p>
              <h2 className="font-semibold">{t("expected")}</h2>
              <ul className="list-disc ps-5 text-muted">{exp.expected.map((e, i) => <li key={i}>{L(e)}</li>)}</ul>
              {exp.teacherNotes && (
                <>
                  <h2 className="font-semibold">{t("teacher_notes")}</h2>
                  <p className="text-muted">{L(exp.teacherNotes)}</p>
                </>
              )}
            </div>
          )}
        </div>
        <div className="h-[640px] lg:sticky lg:top-6">
          <GuidedPanel experimentId={exp.id} />
        </div>
      </div>
    </Page>
  );
}
