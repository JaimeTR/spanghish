import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, StatusBadge } from "@/components/admin/PageHeader";
import { GradeForm } from "@/components/assignments/TeacherForms";
import { PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { formatGrade } from "@/lib/assignments/files";
import { isUuid } from "@/lib/data/catalog";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatInstant } from "@/lib/time";

/** Calificar una tarea: cada alumno matriculado en el grupo con su entrega, su archivo, la nota y el comentario. */
export default async function TeacherAssignmentPage({ params }: { params: Promise<{ locale: string; assignmentId: string }> }) {
  const { locale, assignmentId } = await params;
  if (!isLocale(locale) || !isUuid(assignmentId)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "teacher");
  const t = await getTranslations({ locale, namespace: "assignments.teacher" });
  const supabase = await createClient();
  const { data: a, error } = await supabase
    .from("assignments")
    .select("id, group_id, title, instructions, due_at, max_grade, groups(name), assignment_submissions(id, student_id, text_answer, file_path, file_name, status, grade, feedback, is_late, submitted_at)")
    .eq("id", assignmentId)
    .maybeSingle();
  if (error) throw new Error(`assignments: ${error.code}`);
  if (!a) notFound();
  const enrolled = await supabase.from("enrollments").select("students(id, full_name)").eq("group_id", a.group_id).in("status", ["active", "paused", "completed"]);
  if (enrolled.error) throw new Error(`enrollments: ${enrolled.error.code}`);
  const students = enrolled.data
    .map((e) => e.students)
    .filter((s): s is { id: string; full_name: string } => s !== null)
    .sort((x, y) => x.full_name.localeCompare(y.full_name, locale));
  const bySubmitter = new Map(a.assignment_submissions.map((s) => [s.student_id, s]));

  return (
    <PageContainer>
      <PageHeader
        title={a.title}
        intro={`${a.groups?.name ?? "—"} · ${a.due_at ? t("dueOn", { date: formatInstant(a.due_at, locale) }) : t("noDue")}`}
        back={{ href: `/${locale}/teacher/assignments`, label: t("back") }}
      />
      {a.instructions ? <p className="mt-4 rounded-lg border border-line bg-surface p-4 whitespace-pre-line text-text">{a.instructions}</p> : null}
      <section aria-labelledby="submissions" className="mt-8">
        <h2 id="submissions" className="mb-3 text-xl font-bold text-text">
          {t("submissions")}
        </h2>
        {students.length === 0 ? (
          <p className="text-text-muted">{t("noStudents")}</p>
        ) : (
          <ul className="list-none space-y-4 p-0">
            {students.map((s) => {
              const sub = bySubmitter.get(s.id);
              return (
                <li key={s.id} className="rounded-lg border border-line bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-bold text-text">{s.full_name}</p>
                    {!sub ? (
                      <StatusBadge tone="muted">{t("notSubmitted")}</StatusBadge>
                    ) : sub.status === "graded" ? (
                      <StatusBadge tone="success">{sub.grade !== null ? formatGrade(sub.grade, a.max_grade, locale) : t("graded")}</StatusBadge>
                    ) : (
                      <StatusBadge tone={sub.is_late ? "warning" : "info"}>{sub.is_late ? t("late") : t("submitted")}</StatusBadge>
                    )}
                  </div>
                  {sub ? (
                    <>
                      <p className="text-sm text-text-muted">{t("sentAt", { date: formatInstant(sub.submitted_at, locale) })}</p>
                      {sub.text_answer ? <p className="mt-2 rounded-md bg-surface-sunken p-3 whitespace-pre-line text-text">{sub.text_answer}</p> : null}
                      {sub.file_path ? (
                        <p className="mt-2">
                          <a href={`/${locale}/teacher/assignments/${a.id}/file?student=${s.id}`} className="font-semibold text-structure underline">
                            {sub.file_name ?? t("file")}
                          </a>
                        </p>
                      ) : null}
                      <GradeForm locale={locale} id={sub.id} maxGrade={a.max_grade} grade={sub.grade} feedback={sub.feedback} />
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
