import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, Section } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { getProgram, listLanguages, listLevels } from "@/lib/data/catalog";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/time";
import { languageOptions, levelOptions } from "../options";
import { ProgramForm } from "../ProgramForm";
import { EditionForm } from "./EditionForm";

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ locale: string; programId: string }>;
}) {
  const { locale, programId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const supabase = await createClient();
  const program = await getProgram(supabase, programId);
  if (!program) notFound();

  const [t, te, languages, levels] = await Promise.all([
    getTranslations({ locale, namespace: "catalog" }),
    getTranslations({ locale, namespace: "enums" }),
    listLanguages(supabase),
    listLevels(supabase),
  ]);
  const name = locale === "en" ? program.name_en : program.name_es;

  return (
    <>
      <PageHeader
        title={name}
        intro={`${te(`audience.${program.audience}`)} · ${te(`format.${program.format}`)}`}
        back={{ href: `/${locale}/admin/catalog/programs`, label: t("programs.title") }}
      />

      <Section id="program-editions" title={t("editions.title")}>
        {program.program_editions.length === 0 ? (
          <p className="text-text-muted">{t("editions.empty")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {program.program_editions.map((e) => {
              const label = (locale === "en" ? e.label_en : e.label_es) ?? t("editions.untitled");
              return (
                <li key={e.id} className="py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-text">{label}</h3>
                    <p className="text-sm text-text-muted">
                      {formatDay(e.starts_on, locale)} – {formatDay(e.ends_on, locale)} ·{" "}
                      {te(`editionStatus.${e.status}`)}
                    </p>
                  </div>
                  <details className="mt-2">
                    <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary">
                      {t("edit")}
                      <span className="sr-only"> {label}</span>
                    </summary>
                    <div className="mt-3">
                      <EditionForm locale={locale} programId={program.id} edition={e} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
        <h3 className="mt-6 mb-3 font-semibold text-text">{t("editions.new")}</h3>
        <EditionForm locale={locale} programId={program.id} />
      </Section>

      <Section id="program-data" title={t("programs.data")}>
        <ProgramForm
          locale={locale}
          program={program}
          languages={languageOptions(languages, locale)}
          levels={levelOptions(levels, languages, locale)}
        />
      </Section>
    </>
  );
}
