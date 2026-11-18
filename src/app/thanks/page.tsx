"use client";
import Link from "next/link";
import { Page } from "@/components/ui/Page";
import { ThankYouContent } from "@/components/shell/ThankYou";
import { EXPERIMENTS } from "@/lib/curriculum/experiments";
import { useSession } from "@/lib/client/session";
import { useApi } from "@/lib/client/useApi";
import { useI18n } from "@/lib/i18n/client";

export default function Thanks() {
  const { L } = useI18n();
  const { user } = useSession();
  const { data } = useApi<{ completed: string[] }>(user ? "/api/progress" : null);
  const done = new Set(data?.completed ?? []);
  const left = EXPERIMENTS.filter((e) => !done.has(e.id));
  if (data && left.length === 0)
    return (
      <Page title="">
        <ThankYouContent />
      </Page>
    );
  return (
    <Page title={L({ en: "Almost there!", ar: "اقتربت!" })} subtitle={L({ en: "Finish every challenge to unlock the thank-you message.", ar: "أكمل كل التحديات لتفتح رسالة الشكر." })}>
      <div className="panel p-5">
        <div className="mb-2 flex justify-between text-sm">
          <span>{L({ en: "Challenges completed", ar: "التحديات المكتملة" })}</span>
          <span className="mono ltr-num">
            {EXPERIMENTS.length - left.length}/{EXPERIMENTS.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full bg-gradient-to-r from-accent to-ok transition-[width] duration-700" style={{ width: `${((EXPERIMENTS.length - left.length) / EXPERIMENTS.length) * 100}%` }} />
        </div>
        <ul className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
          {left.map((e) => (
            <li key={e.id}>
              <Link className="text-accent hover:underline" href={e.lab === "physics" || e.lab === "chemistry" ? `/lab/${e.lab}?experiment=${e.id}` : `/experiments/${e.id}`}>
                {L(e.title)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Page>
  );
}
