import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { LessonBlocks } from "@/components/content/LessonBlocks";
import { isLocale } from "@/i18n/routing";
import { getAdminLesson } from "@/lib/data/content";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
export default async function LessonPreviewPage({ params, searchParams }: { params: Promise<{ locale: string; lessonId: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { locale, lessonId } = await params; const query = await searchParams; if (!isLocale(locale)) notFound(); setRequestLocale(locale); await requireArea(locale, "admin");
  const language = query.lang === "en" ? "en" : "es"; const detail = await getAdminLesson(await createClient(), lessonId); if (!detail) notFound();
  const [t, blocksT] = await Promise.all([getTranslations({ locale: language, namespace: "content.lessons" }), getTranslations({ locale: language, namespace: "content.blocks" })]);
  return <><p role="status" className="mb-4 rounded bg-brand-yellow p-3">{t("previewDraft")}</p><PageHeader title={language === "es" ? detail.lesson.title_es : detail.lesson.title_en} intro={language === "es" ? detail.lesson.summary_es ?? "" : detail.lesson.summary_en ?? ""} /><article className="prose mt-8 max-w-none"><LessonBlocks blocks={detail.blocks} locale={language} videoTitle={blocksT("videoTitle")} playLabel={blocksT("playVideo")} /></article></>;
}
