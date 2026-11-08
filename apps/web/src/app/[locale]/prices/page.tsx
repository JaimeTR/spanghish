import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Bubble, SectionQuestion } from "@/components/Bubble";
import { FreeLessonBand } from "@/components/FreeLessonBand";
import { ArrowIcon, CheckIcon } from "@/components/icons";
import { HeroChat, heroButtons, PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { PriceHighlights } from "@/components/PriceHighlights";
import { PriceItem } from "@/components/PriceItem";
import { btnInk, btnPrimary, container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { crumbsJsonLd, innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { PRICE_VALUES, type PriceName } from "@/lib/prices";
import { bookingPath, localePath } from "@/lib/routes";
import { CONTACT } from "@/lib/site";

/** Programas con precio cerrado: la cifra grande sale de lib/prices.ts. */
const PROGRAMS: { key: string; amount: PriceName }[] = [
  { key: "mature", amount: "matureLesson" },
  { key: "online", amount: "onlineUpfront" },
  { key: "nineWeek", amount: "nineWeekUpfront" },
  { key: "sixWeek", amount: "sixWeekUpfront" },
];
const ROWS = ["free", "group", "private", "mature", "online", "editions"] as const;
const COLUMNS = ["audience", "format", "length", "price"] as const;
const NOTES = ["currency", "private", "mature", "payment", "changes"] as const;

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "prices", "prices");
}

/**
 * Precios y formatos. Mismas cifras y textos que la sección de precios de la
 * home (PriceHighlights + lib/prices.ts), más los programas con precio cerrado
 * y una tabla para comparar de un vistazo. Sin IVA/GST: no hay dato publicado.
 */
export default async function PricesPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "page.prices" });
  const tp = await getTranslations({ locale, namespace: "prices" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const v = (key: string) => t(key, PRICE_VALUES);
  const buttons = heroButtons("burgundy");

  return (
    <PageShell locale={locale} route="prices" jsonLd={[await crumbsJsonLd(locale, [{ route: "prices", name: t("title") }])]}>
      <PageHero
        tone="burgundy"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: t("title"), href: localePath(locale, "prices") },
        ]}
        titleA={t("title")}
        lead={<p>{t("lead")}</p>}
        actions={
          <>
            <Link href={bookingPath(locale)} className={buttons.primary}>
              {tn("cta")}
              <ArrowIcon />
            </Link>
            <a href="#compare" className={buttons.secondary}>
              {t("compareQuestion")}
            </a>
          </>
        }
        aside={<HeroChat ask={t("ask")} answer={t("answer")} answerTone="yellow" />}
      />

      {/* Lo principal: el mismo bloque que la home. */}
      <section aria-labelledby="main-prices-title" className="bg-cream py-20 lg:py-28">
        <div className={container}>
          <div className="flex flex-col items-start gap-4">
            <SectionQuestion id="main-prices-title" tone="fuchsia">
              {tp("question")}
            </SectionQuestion>
            <p className="text-lg text-ink-muted">{tp("intro")}</p>
          </div>
          <PriceHighlights />
        </div>
      </section>

      {/* Programas con precio cerrado */}
      <section aria-labelledby="programs-title" className="bg-surface-sunken py-20 lg:py-28">
        <div className={container}>
          <div className="flex flex-col items-start gap-4">
            <SectionQuestion id="programs-title" tone="white" tail="right">
              {t("programsQuestion")}
            </SectionQuestion>
            <p className="text-lg text-ink-muted">{t("programsIntro")}</p>
          </div>
          <ul className="mt-12 grid border-t-2 border-ink md:grid-cols-2 lg:grid-cols-4">
            {PROGRAMS.map((p) => (
              <PriceItem key={p.key} amount={PRICE_VALUES[p.amount]} unit={t(`programs.${p.key}.unit`)} title={t(`programs.${p.key}.title`)}>
                <ul className="flex flex-col gap-1.5">
                  {Object.keys(t.raw(`programs.${p.key}.details`) as Record<string, string>).map((d) => (
                    <li key={d} className="flex items-start gap-2 leading-relaxed text-ink-muted">
                      <CheckIcon className="mt-1 size-4 shrink-0 text-brand-fuchsia" />
                      {v(`programs.${p.key}.details.${d}`)}
                    </li>
                  ))}
                </ul>
              </PriceItem>
            ))}
          </ul>
          <Bubble
            tone="yellow"
            tail="right"
            shadow
            className="mt-14 md:ml-auto md:max-w-[40rem]"
            boxClassName="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8"
          >
            <div>
              <h3 className="font-display text-[1.75rem] leading-tight text-brand-burgundy">{t("datesTitle")}</h3>
              <p className="mt-1 leading-relaxed text-ink">{t("datesBody")}</p>
            </div>
            <Link href={localePath(locale, "contact")} className={`${btnPrimary} shrink-0`}>
              {t("datesCta")}
            </Link>
          </Bubble>
        </div>
      </section>

      {/* Comparativa: tabla en pantallas anchas, lista por opción en móvil (sin scroll lateral). */}
      <section id="compare" aria-labelledby="compare-title" className="bg-cream py-20 lg:py-28">
        <div className={container}>
          <SectionQuestion id="compare-title" tone="purple">
            {t("compareQuestion")}
          </SectionQuestion>

          <table className="mt-12 hidden w-full border-collapse text-left lg:table">
            <caption className="sr-only">{t("compareCaption")}</caption>
            <thead>
              <tr className="border-b-2 border-ink">
                <th scope="col" className="w-[20%] pr-6 pb-4 align-bottom font-display text-[1.5rem] font-normal text-brand-purple">
                  {t("columns.option")}
                </th>
                {COLUMNS.map((c) => (
                  <th key={c} scope="col" className="pr-6 pb-4 align-bottom font-display text-[1.5rem] font-normal text-brand-purple">
                    {t(`columns.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r} className="border-b border-ink/15 align-top">
                  <th scope="row" className="py-5 pr-6 text-lg font-extrabold text-ink">
                    {t(`rows.${r}.option`)}
                  </th>
                  {COLUMNS.map((c) => (
                    <td
                      key={c}
                      className={`py-5 pr-6 text-[1.0625rem] leading-relaxed text-ink ${c === "length" ? "whitespace-nowrap" : ""} ${
                        c === "price" ? "w-[26%] font-semibold" : ""
                      }`}
                    >
                      {v(`rows.${r}.${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-12 grid gap-10 md:grid-cols-2 lg:hidden">
            {ROWS.map((r) => (
              <section key={r} aria-labelledby={`compare-${r}`} className="border-t-2 border-ink pt-5">
                <h3 id={`compare-${r}`} className="font-display text-[1.75rem] leading-tight text-brand-purple">
                  {t(`rows.${r}.option`)}
                </h3>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  {COLUMNS.map((c) => (
                    <div key={c} className="contents">
                      <dt className="font-extrabold text-ink">{t(`columns.${c}`)}</dt>
                      <dd className="leading-relaxed text-ink">{v(`rows.${r}.${c}`)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      </section>

      {/* A tener en cuenta */}
      <section aria-labelledby="notes-title" className="bg-surface-sunken py-20 lg:py-24">
        <div className={`${container} grid gap-10 lg:grid-cols-12`}>
          <div className="lg:col-span-5">
            <SectionQuestion id="notes-title" tone="yellow">
              {t("notesQuestion")}
            </SectionQuestion>
          </div>
          <div className="lg:col-span-7">
            <ul className="flex flex-col gap-3">
              {NOTES.map((n) => (
                <li key={n} className="flex items-start gap-3 text-lg leading-relaxed text-ink">
                  <CheckIcon className="mt-1.5 size-5 shrink-0 text-brand-fuchsia" />
                  {t(`notes.${n}`)}
                </li>
              ))}
            </ul>
            <a href={`mailto:${CONTACT.email}`} className={`${btnInk} mt-8`}>
              {t("askPrivate")}
              <span className="sr-only">: {CONTACT.email}</span>
            </a>
          </div>
        </div>
      </section>

      <FreeLessonBand />
    </PageShell>
  );
}
