import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { AssignmentStateBadge } from "@/components/assignments/AssignmentStateBadge";
import { SubmissionForm } from "@/components/assignments/SubmissionForm";
import { PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { assignmentState, formatGrade } from "@/lib/assignments/files";
import { isUuid } from "@/lib/data/catalog";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatInstant } from "@/lib/time";

/** Una tarea: instrucciones, mi entrega (reenviable hasta que se califique) y la nota de la docente. */
export default async function StudentAssignmentPage({ params }: { params: Promise<{ locale: string; assignmentId: string }> }) {
  const { locale, assignmentId } = await params;
  if (!isLocale(locale) || !isUuid(assignmentId)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "student");
  const t = await getTranslations({ locale, namespace: "assignments" });
  const supabase = await createClient();
  const [assignment, student] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, instructions, due_at, max_grade, groups(name), assignment_submissions(id, text_answer, file_path, file_name, status, grade, feedback, is_late, submitted_at)")
      .eq("id", assignmentId)
      .maybeSingle(),
    supabase.from("students").select("id").limit(1).maybeSingle(),
  ]);
  if (assignment.error) throw new Error(`assignments: ${assignment.error.code}`);
  if (!assignment.data || !student.data) notFound();
  const a = assignment.data;
  const submission = a.assignment_submissions[0] ?? null;
  const state = assignmentState(submission, a.due_at);

  return (
    <PageContainer>
      <PageHeader title={a.title} intro={`${a.groups?.name ?? "—"} · ${a.due_at ? t("dueOn", { date: formatInstant(a.due_at, locale) }) : t("noDue")}`} back={{ href: `/${locale}/student/assignments`, label: t("back") }} action={<AssignmentStateBadge state={state} />} />
      {a.instructions ? <p className="mt-6 rounded-lg border border-line bg-surface p-5 whitespace-pre-line text-text">{a.instructions}</p> : null}

      {submission?.status === "graded" ? (
        <section aria-labelledby="my-grade" className="mt-6 rounded-lg border border-line border-l-4 border-l-success bg-surface p-5">
          <h2 id="my-grade" className="text-lg font-bold text-text">
            {t("student.result")}
          </h2>
          <p className="mt-1 text-2xl font-extrabold text-text">{submission.grade !== null ? formatGrade(submission.grade, a.max_grade, locale) : "—"}</p>
          {submission.feedback ? <p className="mt-2 whitespace-pre-line text-text">{submission.feedback}</p> : null}
        </section>
      ) : null}

      <section aria-labelledby="my-submission" className="mt-8">
        <h2 id="my-submission" className="mb-3 text-xl font-bold text-text">
          {t("student.mine")}
        </h2>
        {submission?.status === "graded" ? (
          <div className="rounded-lg border border-line bg-surface p-5">
            {submission.text_answer ? <p className="whitespace-pre-line text-text">{submission.text_answer}</p> : null}
            {submission.file_path ? (
              <p className="mt-3">
                <a href={`/${locale}/student/assignments/${a.id}/file`} className="font-semibold text-structure underline">
                  {submission.file_name ?? t("file")}
                </a>
              </p>
            ) : null}
            <p className="mt-3 text-sm text-text-muted">{t("student.locked")}</p>
          </div>
        ) : (
          <>
            {submission ? (
              <p className="mb-3 text-sm text-text-muted">
                {t("student.sentAt", { date: formatInstant(submission.submitted_at, locale) })}
                {submission.file_path ? (
                  <>
                    {" · "}
                    <a href={`/${locale}/student/assignments/${a.id}/file`} className="font-semibold text-structure underline">
                      {submission.file_name ?? t("file")}
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
            <SubmissionForm
              locale={locale}
              assignmentId={a.id}
              studentId={student.data.id}
              initialText={submission?.text_answer ?? null}
              initialFileName={submission?.file_name ?? null}
              hasFile={Boolean(submission?.file_path)}
            />
          </>
        )}
      </section>
    </PageContainer>
  );
}
