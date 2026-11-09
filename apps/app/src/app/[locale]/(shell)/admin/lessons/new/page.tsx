import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { listLevels } from "@/lib/data/content";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { LessonForm } from "../LessonForm";
export default async function NewLessonPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ category?: string; level?: string }> }) {
  const { locale } = await params; const query = await searchParams; if (!isLocale(locale)) notFound(); setRequestLocale(locale); await requireArea(locale, "admin");
  const [t, levels] = await Promise.all([getTranslations({ locale, namespace: "content.lessons" }), createClient().then((db) => listLevels(db))]);
  const category = ["foundations", "kids", "adults", "stories", "games"].includes(query.category ?? "") ? query.category : "foundations";
  const levelId = levels.find((level) => level.code === query.level || level.id === query.level)?.id;
  return <><PageHeader title={t("new")} back={{ href: `/${locale}/admin/lessons`, label: t("back") }} /><LessonForm locale={locale} levels={levels} defaults={{ category, levelId }} /></>;
}
