import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { listLanguages, listLevels } from "@/lib/data/catalog";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { languageOptions, levelOptions } from "../options";
import { ProgramForm } from "../ProgramForm";

export default async function NewProgramPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "catalog.programs" });
  const supabase = await createClient();
  const [languages, levels] = await Promise.all([listLanguages(supabase), listLevels(supabase)]);

  return (
    <>
      <PageHeader
        title={t("new")}
        intro={t("newIntro")}
        back={{ href: `/${locale}/admin/catalog/programs`, label: t("title") }}
      />
      <div className="mt-8 rounded-md border border-line bg-surface p-5">
        <ProgramForm
          locale={locale}
          languages={languageOptions(languages, locale)}
          levels={levelOptions(levels, languages, locale)}
        />
      </div>
    </>
  );
}
