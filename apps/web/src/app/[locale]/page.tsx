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
import { PageShell } from "@/components/PageShell";
import { isLocale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { organizationJsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, route: "home", title: t("title"), description: t("description"), ogAlt: t("ogAlt") });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const tm = await getTranslations({ locale, namespace: "meta" });

  return (
    <PageShell locale={locale} route="home" jsonLd={[organizationJsonLd(locale, tm("description"))]}>
      <Hero />
      <Lessons />
      <HowItWorks />
      <Prices />
      <Maribel />
      <LearnNow />
      <Contact />
    </PageShell>
  );
}
