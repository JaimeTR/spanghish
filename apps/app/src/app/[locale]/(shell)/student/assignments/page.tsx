import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AssignmentStateBadge } from "@/components/assignments/AssignmentStateBadge";
import { EmptyState, HeroHeader, PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { assignmentState, formatGrade } from "@/lib/assignments/files";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatInstant } from "@/lib/time";

/** Tareas del alumno: las publicadas en sus grupos, con su fecha de entrega y el estado de su entrega. */
export default async function StudentAssignmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "student");
  const t = await getTranslations({ locale, namespace: "assignments" });
  const { data, error } = await (await createClient())
    .from("assignments")
    .select("id, title, due_at, max_grade, groups(name), assignment_submissions(status, is_late, grade)")
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(200);
  if (error) throw new Error(`assignments: ${error.code}`);
  const now = new Date();
  const rows = data.map((a) => {
    const submission = a.assignment_submissions[0] ?? null;
    return { a, submission, state: assignmentState(submission, a.due_at, now) };
  });
  // Primero lo que falta entregar, luego lo entregado y calificado.
  const order = { todo: 0, overdue: 1, late: 2, submitted: 2, graded: 3 } as const;
  rows.sort((x, y) => order[x.state] - order[y.state]);

  return (
    <PageContainer>
      <HeroHeader eyebrow={t("eyebrow")} title={t("student.title")} lead={t("student.lead")} />
      {rows.length === 0 ? (
        <EmptyState>{t("student.empty")}</EmptyState>
      ) : (
        <ul className="mt-8 list-none space-y-3 p-0">
          {rows.map(({ a, submission, state }) => (
            <li key={a.id}>
              <Link
                href={`/${locale}/student/assignments/${a.id}`}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-[var(--shape-lg)] border border-line border-l-4 border-l-brand-yellow bg-surface p-4 hover:bg-surface-sunken focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
              >
                <span className="min-w-0">
                  <span className="block font-bold text-text">{a.title}</span>
                  <span className="block text-sm text-text-muted">
                    {a.groups?.name ?? "—"} · {a.due_at ? t("dueOn", { date: formatInstant(a.due_at, locale) }) : t("noDue")}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {submission?.grade !== null && submission?.grade !== undefined ? <span className="font-bold text-text">{formatGrade(submission.grade, a.max_grade, locale)}</span> : null}
                  <AssignmentStateBadge state={state} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
