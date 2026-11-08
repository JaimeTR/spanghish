import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SectionQuestion } from "@/components/Bubble";
import { Faq } from "@/components/Faq";
import { FreeLessonBand } from "@/components/FreeLessonBand";
import { HeroChat, PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { btnInk, container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { crumbsJsonLd, innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { PRICE_VALUES } from "@/lib/prices";
import { localePath } from "@/lib/routes";
import { faqPageJsonLd } from "@/lib/structured-data";

/** Color del campo de cada tema: alternan para separar bloques sin líneas. */
const FIELDS = ["bg-cream", "bg-surface-sunken"] as const;
const TONES = ["purple", "fuchsia", "yellow"] as const;

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "faq", "faq");
}

/**
 * Preguntas frecuentes por temas. Solo respuestas con respaldo en la web
 * actual o en los textos ya publicados; lo que no se sabe (plazos de
 * cancelación, reembolsos...) no se responde: se remite a contacto.
 */
export default async function FaqPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "page.faq" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const path = localePath(locale, "faq");

  const groups = Object.keys(t.raw("groups") as Record<string, unknown>).map((g) => ({
    key: g,
    title: t(`groups.${g}.title`),
    items: Object.keys(t.raw(`groups.${g}.items`) as Record<string, unknown>).map((k) => ({
      key: k,
      q: t(`groups.${g}.items.${k}.q`),
      a: t(`groups.${g}.items.${k}.a`, PRICE_VALUES),
    })),
  }));

  return (
    <PageShell
      locale={locale}
      route="faq"
      jsonLd={[
        faqPageJsonLd(locale, path, groups.flatMap((g) => g.items)),
        await crumbsJsonLd(locale, [{ route: "faq", name: t("title") }]),
      ]}
    >
      <PageHero
        tone="purple"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: t("title"), href: path },
        ]}
        titleA={t("title")}
        lead={
          <>
            <p>{t("lead")}</p>
            <nav aria-label={t("jumpLabel")} className="mt-6">
              <ul className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <li key={g.key}>
                    <a
                      href={`#faq-${g.key}`}
                      className="inline-flex min-h-11 items-center rounded-full bg-surface px-4 text-base font-bold text-ink no-underline transition-colors duration-200 hover:bg-brand-yellow"
                    >
                      {g.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        }
        aside={<HeroChat ask={t("ask")} answer={t("answer")} answerTone="yellow" />}
      />

      {groups.map((g, i) => (
        <Faq
          key={g.key}
          id={`faq-${g.key}`}
          title={g.title}
          items={g.items}
          tone={TONES[i % TONES.length]}
          className={FIELDS[i % FIELDS.length]}
        />
      ))}

      <section aria-labelledby="ask-title" className="bg-brand-yellow py-16 lg:py-20">
        <div className={`${container} flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between`}>
          <div>
            <SectionQuestion id="ask-title" tone="white">
              {t("contactQuestion")}
            </SectionQuestion>
            <p className="mt-6 text-lg text-ink">{t("contactBody")}</p>
          </div>
          <Link href={localePath(locale, "contact")} className={btnInk}>
            {t("contactCta")}
          </Link>
        </div>
      </section>

      <FreeLessonBand />
    </PageShell>
  );
}
