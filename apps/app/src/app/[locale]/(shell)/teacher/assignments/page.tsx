import { ClipboardList, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, RowActions, StatusBadge } from "@/components/admin/PageHeader";
import { AssignmentDelete, AssignmentForm } from "@/components/assignments/TeacherForms";
import { EmptyState, PageContainer } from "@/components/layout/page-parts";
import { IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatInstant, SCHOOL_TIME_ZONE } from "@/lib/time";

/** "2026-11-20T18:00" en hora escolar (valor de un <input type="datetime-local">). */
function toLocalInput(iso: string | null): string | null {
  if (!iso) return null;
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: SCHOOL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
  return parts.replace(" ", "T");
}

/** Tareas (docente): las de sus grupos, con cuántas entregas llevan; crear, editar y entrar a calificar. */
export default async function TeacherAssignmentsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ new?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "teacher");
  const t = await getTranslations({ locale, namespace: "assignments.teacher" });
  const supabase = await createClient();
  const [assignments, groups] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, group_id, title, instructions, due_at, max_grade, status, groups(name), assignment_submissions(status)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("groups").select("id, name").in("status", ["draft", "active"]).order("name"),
  ]);
  if (assignments.error) throw new Error(`assignments: ${assignments.error.code}`);
  if (groups.error) throw new Error(`groups: ${groups.error.code}`);
  const openNew = (await searchParams).new === "1";

  return (
    <PageContainer>
      <PageHeader
        title={t("title")}
        intro={t("intro")}
        action={
          groups.data.length > 0 ? (
            <ModalButton label={t("new")} title={t("newTitle")} defaultOpen={openNew}>
              <AssignmentForm locale={locale} groups={groups.data} />
            </ModalButton>
          ) : null
        }
      />
      {groups.data.length === 0 ? (
        <EmptyState>{t("noGroups")}</EmptyState>
      ) : assignments.data.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <ul className="mt-6 list-none divide-y divide-line rounded-lg border border-line bg-surface p-0">
          {assignments.data.map((a) => {
            const graded = a.assignment_submissions.filter((s) => s.status === "graded").length;
            return (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4">
                <span className="min-w-0">
                  <span className="block font-semibold text-text">{a.title}</span>
                  <span className="block text-sm text-text-muted">
                    {a.groups?.name ?? "—"} · {a.due_at ? t("dueOn", { date: formatInstant(a.due_at, locale) }) : t("noDue")}
                  </span>
                  <span className="block text-sm text-text-muted">{t("counts", { submitted: a.assignment_submissions.length, graded })}</span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge tone={a.status === "published" ? "success" : "warning"}>{t(`form.${a.status}`)}</StatusBadge>
                  <RowActions>
                    <IconLink href={`/${locale}/teacher/assignments/${a.id}`} label={t("grading")} icon={<ClipboardList className="size-5" strokeWidth={1.75} />} />
                    <ModalButton iconOnly label={t("edit")} title={t("editTitle")} icon={<Pencil className="size-5" strokeWidth={1.75} />}>
                      <AssignmentForm
                        locale={locale}
                        groups={groups.data}
                        assignment={{ id: a.id, group_id: a.group_id, title: a.title, instructions: a.instructions, dueLocal: toLocalInput(a.due_at), max_grade: a.max_grade, status: a.status }}
                      />
                    </ModalButton>
                    <AssignmentDelete id={a.id} locale={locale} />
                  </RowActions>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6">
        <Link href={`/${locale}/teacher/groups`} className="font-semibold text-structure underline">
          {t("seeGroups")}
        </Link>
      </p>
    </PageContainer>
  );
}
