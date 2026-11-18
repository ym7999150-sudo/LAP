"use client";
import { AnimatePresence, motion } from "motion/react";
import { PartyPopper, X } from "lucide-react";
import { useEffect, useState } from "react";
import { EXPERIMENTS } from "@/lib/curriculum/experiments";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useI18n } from "@/lib/i18n/client";

export function ThankYouContent() {
  const { L } = useI18n();
  return (
    <div className="text-center">
      <PartyPopper className="mx-auto text-warn" size={40} />
      <h2 className="mt-3 text-2xl font-bold">{L({ en: "Thank you!", ar: "شكراً لك!" })}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        {L({
          en: "You completed every challenge in LabVerse and earned all the XP. Thank you for learning with us.",
          ar: "أكملت كل التحديات في LabVerse وجمعت كل نقاط الخبرة. شكراً لأنك تعلمت معنا.",
        })}
      </p>
      <video src="/media/thank-you.mp4" className="mx-auto mt-4 max-h-[60dvh] w-auto rounded-2xl border border-line shadow-2xl" controls autoPlay playsInline />
    </div>
  );
}

/** Shows the thank-you video once when a signed-in player has completed every challenge. */
export function ThankYouGate() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    let key = "";
    try {
      key = `labverse-thanks-${user.id}`;
      if (localStorage.getItem(key)) return;
    } catch {}
    api<{ completed: string[] }>("/api/progress")
      .then((r) => {
        const done = new Set(r.completed);
        if (EXPERIMENTS.every((e) => done.has(e.id))) {
          setOpen(true);
          try {
            localStorage.setItem(key, "1");
          } catch {}
        }
      })
      .catch(() => {});
  }, [user]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div className="glass relative max-h-[95dvh] w-full max-w-lg overflow-y-auto rounded-3xl p-6" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-ghost btn-icon absolute end-3 top-3" onClick={() => setOpen(false)} aria-label="close">
              <X size={18} />
            </button>
            <ThankYouContent />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
