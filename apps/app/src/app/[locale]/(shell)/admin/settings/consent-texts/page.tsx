import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, Section } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { currentConsentText, listConsentTexts } from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatDay, schoolToday } from "@/lib/time";
import { ConsentTextForm } from "./ConsentTextForm";

export default async function ConsentTextsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "consents.texts" });
  const te = await getTranslations({ locale, namespace: "enums" });
  const texts = await listConsentTexts(await createClient());
  const today = schoolToday();
  const currentIds = new Set(
    (["enrolment_terms", "privacy", "minor_data", "recordings", "photos"] as const)
      .map((k) => currentConsentText(texts, k, today)?.id)
      .filter((id): id is string => Boolean(id)),
  );

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />

      <Section id="consent-text-list" title={t("list")}>
        {texts.length === 0 ? (
          <p className="text-text-muted">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {texts.map((x) => (
              <li key={x.id} className="py-3">
                <p className="font-semibold text-text">
                  {te(`consentKind.${x.kind}`)} · <span className="font-mono text-sm">{x.id}</span>
                  {currentIds.has(x.id) ? ` · ${t("current")}` : ""}
                </p>
                <p className="text-sm text-text-muted">{t("effective", { date: formatDay(x.effective_from, locale) })}</p>
                <details className="mt-1">
                  <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary">
                    {t("show")}
                    <span className="sr-only"> {x.id}</span>
                  </summary>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <p lang="es" className="text-sm whitespace-pre-line text-text">{x.body_es}</p>
                    <p lang="en" className="text-sm whitespace-pre-line text-text">{x.body_en}</p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="consent-text-new" title={t("new")}>
        <p className="mb-4 text-sm text-text-muted">{t("newHint")}</p>
        <ConsentTextForm locale={locale} today={today} />
      </Section>
    </>
  );
}
