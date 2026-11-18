"use client";
import { ArrowLeft, ArrowRight, FlaskConical, Languages, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shell/Logo";
import { api, ApiError } from "@/lib/client/api";
import { useSession, type Profile } from "@/lib/client/session";
import { useI18n } from "@/lib/i18n/client";

const ERRORS: Record<string, { en: string; ar: string }> = {
  name_too_short: { en: "Name must be at least 2 characters.", ar: "يجب أن يكون الاسم حرفين على الأقل." },
  name_too_long: { en: "Name must be 32 characters or fewer.", ar: "يجب ألا يزيد الاسم عن 32 حرفاً." },
  name_invalid_chars: { en: "Use letters, numbers, spaces, . _ - ' only.", ar: "استخدم الحروف والأرقام والمسافات و . _ - ' فقط." },
  name_reserved: { en: "That name is reserved.", ar: "هذا الاسم محجوز." },
  rate_limited: { en: "Too many attempts — try again later.", ar: "محاولات كثيرة — حاول لاحقاً." },
};

export default function Welcome() {
  const { t, L, locale, setLocale, dir } = useI18n();
  const { user, loading, dbAvailable, setUser } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function enter(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await api<{ user: Profile }>("/api/session", { body: { displayName: name, locale } });
      setUser(r.user);
      router.push("/dashboard");
    } catch (e2) {
      const code = e2 instanceof ApiError ? e2.code : "error";
      setErr(ERRORS[code] ? L(ERRORS[code]) : t("error_generic"));
    } finally {
      setBusy(false);
    }
  }

  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-40 start-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl rtl:translate-x-1/2" />
      <button className="btn btn-ghost absolute end-4 top-4" onClick={() => setLocale(locale === "ar" ? "en" : "ar")}>
        <Languages size={16} /> {locale === "ar" ? "English" : "العربية"}
      </button>

      <div className="animate-in relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={56} />
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{t("appName")}</h1>
          <p className="mt-3 max-w-sm text-muted">{t("tagline")}</p>
        </div>

        <form onSubmit={enter} className="panel p-6 shadow-2xl shadow-black/40">
          <label htmlFor="name" className="text-lg font-semibold">
            {t("welcome_prompt")}
          </label>
          <input
            id="name"
            className="input mt-3 h-12 text-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("welcome_placeholder")}
            maxLength={32}
            autoComplete="nickname"
            autoFocus
            disabled={!dbAvailable}
          />
          {err && (
            <p className="mt-2 text-sm text-danger" role="alert">
              {err}
            </p>
          )}
          <button className="btn btn-primary mt-4 h-12 w-full text-base" disabled={busy || name.trim().length < 2 || !dbAvailable}>
            {busy ? t("loading") : t("welcome_enter")} <Arrow size={18} />
          </button>
          <p className="mt-4 text-xs leading-relaxed text-faint">{dbAvailable ? t("welcome_note") : t("welcome_offline")}</p>
        </form>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={() => router.push("/lab/physics")} className="panel flex items-center gap-3 p-4 text-start text-sm hover:border-line-strong">
            <Zap className="text-accent" size={20} /> {t("nav_physics")}
          </button>
          <button onClick={() => router.push("/lab/chemistry")} className="panel flex items-center gap-3 p-4 text-start text-sm hover:border-line-strong">
            <FlaskConical className="text-chem" size={20} /> {t("nav_chemistry")}
          </button>
        </div>
      </div>
    </div>
  );
}
