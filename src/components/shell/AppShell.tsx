"use client";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { useSession } from "@/lib/client/session";
import { BRAND } from "@/lib/brand";
import { Logo } from "./Logo";
import { MOBILE_TABS, NAV_GROUPS } from "./nav";
import { RewardToasts } from "./RewardToasts";
import { LevelBadge } from "./LevelBadge";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { t } = useI18n();
  const { user } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);
  const bare = path === "/";
  const immersive = path.startsWith("/lab/") && path !== "/lab/free";

  if (bare)
    return (
      <>
        {children}
        <RewardToasts />
      </>
    );

  const isActive = (href: string) => path === href || (href !== "/dashboard" && path.startsWith(href));
  const visible = (admin?: boolean) => !admin || user?.role === "admin";

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      {!immersive && (
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-line bg-surface/60 lg:flex">
          <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
            <Logo />
            <span className="text-[15px] font-bold tracking-tight">{BRAND.name}</span>
          </Link>
          <nav className="scroll-thin flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
            {NAV_GROUPS.map((g, i) => (
              <div key={i} className="mb-3 border-b border-line/60 pb-3 last:border-0">
                {g.items.filter((it) => visible(it.admin)).map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive(it.href) ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
                  >
                    <it.icon size={17} strokeWidth={1.8} />
                    {t(it.label)}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          {user && (
            <Link href="/profile" className="m-3 rounded-xl border border-line bg-surface-2/70 p-3 hover:border-line-strong">
              <LevelBadge compact />
            </Link>
          )}
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {!immersive && (
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur lg:hidden">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Logo />
              <span className="font-bold">{BRAND.short}</span>
            </Link>
            {user && <span className="chip ltr-num">Lv {user.level.level} · {user.level.xp} XP</span>}
          </header>
        )}
        <main className={`flex-1 ${immersive ? "" : "pb-24 lg:pb-0"}`}>{children}</main>
      </div>

      {/* Mobile tab bar */}
      {!immersive && (
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Tabs">
          {MOBILE_TABS.map((it) => (
            <Link key={it.href} href={it.href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${isActive(it.href) ? "text-accent" : "text-muted"}`}>
              <it.icon size={20} strokeWidth={1.8} />
              <span className="max-w-full truncate px-1">{t(it.label)}</span>
            </Link>
          ))}
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted">
            <Menu size={20} strokeWidth={1.8} />
            {t("nav_more")}
          </button>
        </nav>
      )}

      <AnimatePresence>
        {moreOpen && (
          <motion.div className="fixed inset-0 z-50 bg-black/60 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoreOpen(false)}>
            <motion.div
              className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4 pb-8"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold">{t("nav_more")}</span>
                <button className="btn btn-ghost btn-icon" onClick={() => setMoreOpen(false)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {NAV_GROUPS.flatMap((g) => g.items).filter((it) => visible(it.admin)).map((it) => (
                  <Link key={it.href} href={it.href} onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface-2 p-3 text-center text-xs">
                    <it.icon size={20} className="text-accent" />
                    {t(it.label)}
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <RewardToasts />
    </div>
  );
}
