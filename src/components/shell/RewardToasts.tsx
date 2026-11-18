"use client";
import { AnimatePresence, motion } from "motion/react";
import { Award, Sparkles, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useSession } from "@/lib/client/session";
import { sfx } from "@/lib/client/sound";
import { useEffect, useRef } from "react";

export function RewardToasts() {
  const { toasts, dismissToast } = useSession();
  const { t, L } = useI18n();
  const seen = useRef(new Set<number>());
  useEffect(() => {
    for (const x of toasts) {
      if (seen.current.has(x.id)) continue;
      seen.current.add(x.id);
      sfx.reward(!!x.levelUp);
    }
  }, [toasts]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {toasts.map((x) => (
          <motion.button
            key={x.id}
            layout
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            onClick={() => dismissToast(x.id)}
            className="glass pointer-events-auto w-full max-w-sm rounded-2xl p-4 text-start shadow-2xl shadow-black/40"
          >
            {x.levelUp && (
              <div className="mb-2 flex items-center gap-2 font-bold text-accent">
                <TrendingUp size={18} /> {t("level_up")} <span className="ltr-num">→ {x.levelUp}</span>
              </div>
            )}
            {x.xp > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Sparkles size={16} className="text-warn" /> <span className="ltr-num font-semibold">+{x.xp} XP</span>
              </div>
            )}
            {x.unlocked.map((a) => (
              <div key={a.id} className="mt-2 flex items-center gap-2 text-sm">
                <Award size={16} className="text-ok" />
                <span className="text-muted">{t("achievement_unlocked")}:</span> <span className="font-semibold">{L(a.title)}</span>
              </div>
            ))}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
