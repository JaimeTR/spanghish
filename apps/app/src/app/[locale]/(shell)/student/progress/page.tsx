import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, HeroHeader, ListSection, PageContainer, StatCard } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { assignmentsAverage, attendanceSummary } from "@/lib/assignments/progress";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatDay, schoolToday } from "@/lib/time";

/** Progreso del alumno: nivel, asistencia, lecciones completadas, tests y tareas. Todo es lo propio (RLS). */
export default async function StudentProgressPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "student");
  const t = await getTranslations({ locale, namespace: "progress" });
  const supabase = await createClient();
  const es = locale === "es";
  const [student, attendance, lessons, attempts, graded] = await Promise.all([
    supabase.from("students").select("id, levels(code, name_es, name_en)").limit(1).maybeSingle(),
    supabase.from("attendance").select("status").limit(1000),
    supabase.from("lesson_completions").select("completed_at, lessons(slug, title_es, title_en)").order("completed_at", { ascending: false }).limit(200),
    supabase.from("test_attempts").select("passed, percent").not("submitted_at", "is", null).limit(500),
    supabase.from("assignment_submissions").select("grade, assignments(max_grade)").eq("status", "graded").limit(500),
  ]);
  for (const res of [student, attendance, lessons, attempts, graded]) if (res.error) throw new Error(`progress: ${res.error.code}`);

  const att = attendanceSummary(attendance.data!);
  const avg = assignmentsAverage(graded.data!.map((g) => ({ grade: g.grade, max: g.assignments?.max_grade ?? 0 })));
  const passed = attempts.data!.filter((a) => a.passed).length;
  const level = student.data?.levels;

  return (
    <PageContainer size="lg">
      <HeroHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("level")} value={level ? level.code : "—"} hint={level ? (es ? level.name_es : level.name_en) : t("noLevel")} />
        <StatCard
          label={t("attendance")}
          value={att.percent === null ? "—" : `${att.percent}%`}
          hint={att.percent === null ? t("noClasses") : t("attendanceHint", { present: att.present, late: att.late, absent: att.absent, excused: att.excused })}
        />
        <StatCard label={t("lessons")} value={String(lessons.data!.length)} hint={t("lessonsHint")} />
        <StatCard label={t("tests")} value={`${passed}/${attempts.data!.length}`} hint={t("testsHint")} />
        <StatCard label={t("assignments")} value={avg === null ? "—" : `${avg}%`} hint={avg === null ? t("noGraded") : t("assignmentsHint", { count: graded.data!.length })} />
      </dl>

      <ListSection id="progress-lessons" title={t("completedLessons")}>
        {lessons.data!.length === 0 ? (
          <EmptyState className="mt-3">
            {t("noLessons")}{" "}
            <Link href={`/${locale}/student/learn`} className="font-semibold text-structure underline">
              {t("goLearn")}
            </Link>
          </EmptyState>
        ) : (
          <ul className="mt-3 list-none divide-y divide-line rounded-lg border border-line bg-surface p-0">
            {lessons.data!.map((l) => (
              <li key={l.lessons?.slug ?? l.completed_at} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                {l.lessons ? (
                  <Link href={`/${locale}/student/learn/${l.lessons.slug}`} className="font-semibold text-structure underline">
                    {es ? l.lessons.title_es : l.lessons.title_en}
                  </Link>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
                <span className="text-sm text-text-muted">{formatDay(schoolToday(new Date(l.completed_at)), locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </ListSection>
    </PageContainer>
  );
}
