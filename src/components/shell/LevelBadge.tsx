"use client";
import { useI18n } from "@/lib/i18n/client";
import { useSession } from "@/lib/client/session";

export function LevelBadge({ compact = false }: { compact?: boolean }) {
  const { user } = useSession();
  const { t, L } = useI18n();
  if (!user) return null;
  const lv = user.level;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className={`truncate font-semibold ${compact ? "text-sm" : "text-base"}`}>{user.displayName}</div>
          <div className="truncate text-xs text-muted">
            {t("level")} <span className="ltr-num">{lv.level}</span> · {L(lv.title)}
          </div>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent/10 font-bold text-accent ltr-num">{lv.level}</div>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={Math.round(lv.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-electric transition-[width] duration-700" style={{ width: `${lv.progress * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-faint ltr-num">
        <span>{lv.xp} XP</span>
        {lv.next && <span>{lv.next.xpRequired} XP</span>}
      </div>
    </div>
  );
}
