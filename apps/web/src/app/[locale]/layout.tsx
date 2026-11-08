import type { Metadata, Viewport } from "next";
import { Figtree, Lilita_One } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale, routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

// Lilita One: rotulado grueso y redondeado, de la familia del logo (bocadillo de cómic).
// Figtree: sans cálida y muy legible para el texto. Ambas con latin-ext (ñ, á, ¡, ¿).
const display = Lilita_One({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-lilita",
  display: "swap",
});
const body = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-figtree",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: "#FCD404" };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    openGraph: {
      type: "website",
      siteName: "Spanglish",
      locale: locale === "es" ? "es_AU" : "en_AU",
      title: t("title"),
      description: t("description"),
      images: [{ url: "/og-spanglish.png", width: 1200, height: 630, alt: t("ogAlt") }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`} data-scroll-behavior="smooth">
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
