import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { getAdminLesson, listLevels } from "@/lib/data/content";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { LessonForm } from "../LessonForm";
import { DeleteLessonButton } from "../DeleteLessonButton";
import { BlocksEditor } from "./BlocksEditor";
import { PublishButton } from "./PublishButton";
export default async function EditLessonPage({ params, searchParams }: { params: Promise<{ locale: string; lessonId: string }>; searchParams: Promise<{ add?: string; edit?: string }> }) {
  const { locale, lessonId } = await params; const query = await searchParams; if (!isLocale(locale)) notFound(); setRequestLocale(locale); await requireArea(locale, "admin");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lessonId)) notFound();
  const db = await createClient(); const [detail, levels, t] = await Promise.all([getAdminLesson(db, lessonId), listLevels(db), getTranslations({ locale, namespace: "content.lessons" })]);
  if (!detail) notFound(); const { lesson, blocks } = detail;
  return <><PageHeader title={locale === "es" ? lesson.title_es : lesson.title_en} intro={`${lesson.slug} · ${t(`categoryNames.${lesson.category}`)} · ${t(`kindNames.${lesson.kind}`)}`} back={{ href: `/${locale}/admin/lessons`, label: t("back") }} />
    <LessonForm locale={locale} lesson={lesson} levels={levels} />
    <div className="mt-6 flex flex-wrap items-center gap-4"><span>{t(`statusNames.${lesson.status}`)}</span><Link className="underline" href={`/${locale}/admin/lessons/${lesson.id}/preview?lang=${locale}`}>{t("preview")}</Link></div>
    <PublishButton locale={locale} id={lesson.id} published={lesson.status === "published"} />
    {lesson.kind === "article" ? <BlocksEditor lessonId={lesson.id} blocks={blocks} locale={locale} /> : null}
    {lesson.kind === "article" ? <DeleteLessonButton id={lesson.id} locale={locale} /> : null}
  </>;
}
