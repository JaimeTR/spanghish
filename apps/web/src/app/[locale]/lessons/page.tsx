import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AUDIENCE_STYLE } from "@/components/audience-style";
import { AudienceTile } from "@/components/AudienceTile";
import { SectionQuestion } from "@/components/Bubble";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FreeLessonBand } from "@/components/FreeLessonBand";
import { HowItWorks } from "@/components/home/HowItWorks";
import { SparkIcon } from "@/components/icons";
import { PageShell } from "@/components/PageShell";
import { container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { AUDIENCES, type Audience } from "@/lib/lessons";
import { crumbsJsonLd, innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { localePath } from "@/lib/routes";

const AUDIENCE_KEYS = Object.keys(AUDIENCES) as Audience[];

/** Filas de la tabla comparativa: clave del texto por público (o "none"). */
const ROWS: { key: string; label: string; cells: Record<Audience, string> }[] = [
  { key: "private", label: "formats.private", cells: { adults: "private", kids: "private", mature: "privateMature" } },
  { key: "own", label: "formats.own", cells: { adults: "own", kids: "own", mature: "ownMature" } },
  { key: "local", label: "formats.local", cells: { adults: "local", kids: "local", mature: "none" } },
  { key: "programs", label: "rowPrograms", cells: { adults: "programs", kids: "programs", mature: "programsMature" } },
  { key: "price", label: "rowPrice", cells: { adults: "price", kids: "price", mature: "priceMature" } },
];

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "lessons", "lessons");
}

/** Resumen de clases: elegir público y comparar formatos y precios publicados. */
export default async function LessonsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "page.lessons" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const th = await getTranslations({ locale, namespace: "hero" });
  const label = (key: string) => (key.startsWith("formats.") ? tc(key) : t(key));

  return (
    <PageShell locale={locale} route="lessons" jsonLd={[await crumbsJsonLd(locale, [{ route: "lessons", name: tn("lessons") }])]}>
      <section aria-labelledby="page-title" className="bg-cream">
        <div className={`${container} pt-3 pb-20 sm:pt-5 lg:pb-28`}>
          <Breadcrumbs
            items={[
              { label: tn("homeCrumb"), href: localePath(locale, "home") },
              { label: tn("lessons"), href: localePath(locale, "lessons") },
            ]}
          />
          <div className="mt-6 grid gap-6 lg:mt-10 lg:grid-cols-12 lg:items-end">
            <h1 id="page-title" className="lettering font-display text-[clamp(3rem,10vw,5.5rem)] leading-[0.95] text-brand-fuchsia lg:col-span-6">
              {t("title")}
            </h1>
            <div className="lg:col-span-6">
              <p className="max-w-[34rem] text-lg leading-relaxed text-ink sm:text-xl">{t("lead")}</p>
              <p className="mt-4 flex items-start gap-2 font-semibold text-brand-burgundy">
                <SparkIcon />
                {th("free")}
              </p>
            </div>
          </div>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {AUDIENCE_KEYS.map((a, i) => (
              <AudienceTile
                key={a}
                className={`${AUDIENCE_STYLE[a].tile} lg:min-h-[22rem] ${i === 0 ? "sm:col-span-2 lg:col-span-1" : ""}`}
                href={localePath(locale, AUDIENCES[a].route)}
                age={tc(`audiences.${a}.age`)}
                title={tn(a)}
                body={t(`audiences.${a}`)}
                headingLevel={2}
              />
            ))}
          </ul>
        </div>
      </section>

      {/* Comparativa */}
      <section aria-labelledby="compare-title" className="bg-surface-sunken py-20 lg:py-28">
        <div className={container}>
          <div className="flex flex-col items-start gap-4">
            <SectionQuestion id="compare-title" tone="yellow">
              {t("compareQuestion")}
            </SectionQuestion>
            <p className="text-lg text-ink-muted">
              {t("compareIntro")} {tc("pricesNote")}
            </p>
          </div>

          {/* Tabla real en pantallas anchas; en móvil, una lista por público (sin scroll lateral). */}
          <table className="mt-12 hidden w-full border-collapse text-left lg:table">
            <caption className="sr-only">{t("compareCaption")}</caption>
            <thead>
              <tr className="border-b-2 border-ink">
                <td className="w-[16%] pb-4" />
                {AUDIENCE_KEYS.map((a) => (
                  <th key={a} scope="col" className="w-[28%] pr-6 pb-4 align-bottom">
                    <span className="flex items-baseline gap-3">
                      <span className="font-display text-[2rem] leading-none text-brand-purple">{tc(`audiences.${a}.name`)}</span>
                      <span className="font-semibold text-ink-muted">{tc(`audiences.${a}.age`)}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key} className="border-b border-ink/15 align-top">
                  <th scope="row" className="py-5 pr-6 text-lg font-extrabold text-ink">
                    {label(row.label)}
                  </th>
                  {AUDIENCE_KEYS.map((a) => (
                    <td
                      key={a}
                      className={`py-5 pr-6 text-[1.0625rem] leading-relaxed ${row.cells[a] === "none" ? "text-ink-muted" : "text-ink"}`}
                    >
                      {t(`rows.${row.cells[a]}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-12 grid gap-10 md:grid-cols-3 lg:hidden">
            {AUDIENCE_KEYS.map((a) => (
              <section key={a} aria-labelledby={`compare-${a}`} className="border-t-2 border-ink pt-5">
                <h3 id={`compare-${a}`} className="flex items-baseline gap-3">
                  <span className="font-display text-[2rem] leading-none text-brand-purple">{tc(`audiences.${a}.name`)}</span>
                  <span className="font-semibold text-ink-muted">{tc(`audiences.${a}.age`)}</span>
                </h3>
                <dl className="mt-4 flex flex-col gap-4">
                  {ROWS.map((row) => (
                    <div key={row.key}>
                      <dt className="font-extrabold text-ink">{label(row.label)}</dt>
                      <dd className={`mt-0.5 leading-relaxed ${row.cells[a] === "none" ? "text-ink-muted" : "text-ink"}`}>
                        {t(`rows.${row.cells[a]}`)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      </section>

      <HowItWorks />
      <FreeLessonBand />
    </PageShell>
  );
}
