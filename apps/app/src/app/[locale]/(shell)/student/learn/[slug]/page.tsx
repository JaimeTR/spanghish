import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LessonCompleteButton } from "@/components/assignments/LessonCompleteButton";
import { LessonBlocks } from "@/components/content/LessonBlocks";
import { isLocale } from "@/i18n/routing";
import { getPortalLesson } from "@/lib/data/content";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";

export default async function StudentLessonPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params; if (!isLocale(rawLocale)) notFound(); const locale = rawLocale;
  setRequestLocale(locale); await requireArea(locale, "student");
  const [lesson, t] = await Promise.all([createClient().then((client) => getPortalLesson(client, slug)), getTranslations({ locale, namespace: "studentContent.learn" })]);
  if (!lesson) notFound();
  const { lesson: detail } = lesson;
  // Progreso: ¿tiene esta persona ficha de alumno y ya completó la lección?
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("id").limit(1).maybeSingle();
  const done = student ? Boolean((await supabase.from("lesson_completions").select("lesson_id").eq("student_id", student.id).eq("lesson_id", detail.id).maybeSingle()).data) : false;
  return <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6"><article><header className="mb-8 rounded-[var(--shape-lg)] bg-structure p-6 text-on-structure"><p className="font-semibold">{t(`categories.${detail.category}`)}{detail.levelCode ? ` · ${detail.levelCode}` : ""}</p><h1 className="mt-2 text-3xl font-extrabold">{locale === "es" ? detail.titleEs : detail.titleEn}</h1>{(locale === "es" ? detail.summaryEs : detail.summaryEn) ? <p className="mt-3 text-lg">{locale === "es" ? detail.summaryEs : detail.summaryEn}</p> : null}</header><LessonBlocks blocks={lesson.blocks} locale={locale} />{student ? <LessonCompleteButton locale={locale} studentId={student.id} lessonId={detail.id} done={done} /> : null}</article></div>;
}
