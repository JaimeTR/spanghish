import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Contact } from "@/components/home/Contact";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { LearnNow } from "@/components/home/LearnNow";
import { Lessons } from "@/components/home/Lessons";
import { Maribel } from "@/components/home/Maribel";
import { Prices } from "@/components/home/Prices";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { isLocale, routing } from "@/i18n/routing";
import { organizationJsonLd, serializeJsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
        "x-default": `/${routing.defaultLocale}`,
      },
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "a11y" });
  const tm = await getTranslations({ locale, namespace: "meta" });

  return (
    <>
      <a
        href="#main"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-full bg-ink px-5 py-3 font-bold text-cream no-underline [--focus-color:var(--brand-yellow)] focus:translate-y-0"
      >
        {t("skip")}
      </a>
      <SiteHeader locale={locale} />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Lessons />
        <HowItWorks />
        <Prices />
        <Maribel />
        <LearnNow />
        <Contact />
      </main>
      <SiteFooter locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd(locale, tm("description"))) }}
      />
    </>
  );
}
