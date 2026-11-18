import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/AppShell";
import { BRAND } from "@/lib/brand";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/dict";
import { I18nProvider } from "@/lib/i18n/client";
import { SessionProvider } from "@/lib/client/session";
import "./globals.css";

const latin = Inter({ subsets: ["latin"], variable: "--font-latin", display: "swap" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-arabic", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face", display: "swap" });

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
};

export const viewport: Viewport = { themeColor: "#0a0d11", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = c === "en" ? "en" : "ar";
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${latin.variable} ${arabic.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <I18nProvider initial={locale}>
          <SessionProvider>
            <AppShell>{children}</AppShell>
          </SessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
