"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DICTS, LOCALE_COOKIE, type DictKey, type Locale } from "./dict";

interface I18n {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: (k: DictKey) => string;
  /** Pick the right language from a bilingual content object. */
  L: (v: { en: string; ar: string } | undefined | null) => string;
  setLocale: (l: Locale) => void;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ initial, children }: { initial: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  }, []);
  const value = useMemo<I18n>(
    () => ({
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      t: (k) => DICTS[locale][k] ?? k,
      L: (v) => (v ? v[locale] || v.en : ""),
      setLocale,
    }),
    [locale, setLocale],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n outside provider");
  return v;
}
