import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { listLanguages, listLevels } from "@/lib/data/catalog";
import { currentConsentText, listConsentTexts, listGuardians } from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatDay, schoolToday } from "@/lib/time";
import { levelOptions } from "../../catalog/programs/options";
import { StudentForm } from "./StudentForm";

export default async function NewStudentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "students" });
  const supabase = await createClient();
  const [languages, levels, guardians, texts] = await Promise.all([
    listLanguages(supabase),
    listLevels(supabase),
    listGuardians(supabase),
    listConsentTexts(supabase),
  ]);
  const text = currentConsentText(texts, "minor_data", schoolToday());

  return (
    <>
      <PageHeader
        title={t("new.title")}
        intro={t("new.intro")}
        back={{ href: `/${locale}/admin/students`, label: t("title") }}
      />
      <StudentForm
        locale={locale}
        levels={levelOptions(levels, languages, locale)}
        guardians={guardians.map((g) => ({ value: g.id, label: `${g.full_name} (${g.email})` }))}
        consentText={
          text
            ? {
                id: text.id,
                body: locale === "en" ? text.body_en : text.body_es,
                effectiveFrom: formatDay(text.effective_from, locale),
              }
            : null
        }
      />
    </>
  );
}
