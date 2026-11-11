import { CalendarDays, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, StatusBadge } from "@/components/admin/PageHeader";
import { EmptyState, PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatSessionTime, schoolToday } from "@/lib/time";

const TONES = { draft: "warning", active: "success", completed: "info", cancelled: "muted" } as const;

/** Mis grupos (docente): alumnos matriculados, horario semanal, sede y próxima clase. RLS limita a sus grupos. */
export default async function TeacherGroupsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "teacher");
  const t = await getTranslations({ locale, namespace: "classes.teacherGroups" });
  const tw = await getTranslations({ locale, namespace: "classes.schedule" });
  const ts = await getTranslations({ locale, namespace: "adminGroups" });
  const es = locale === "es";
  const now = new Date().toISOString();
  const { data, error } = await (await createClient())
    .from("groups")
    .select(
      "id, name, code, status, capacity, meeting_url, location_note, programs(name_es, name_en), locations(name), schedule_rules(id, weekday, start_time, duration_minutes, active), enrollments(status, students(id, full_name)), sessions(id, starts_at, ends_at, status)",
    )
    .in("status", ["draft", "active"])
    // Solo las clases que vienen: no hace falta traer todo el historial del grupo.
    .eq("sessions.status", "scheduled")
    .gte("sessions.starts_at", now)
    .order("name");
  if (error) throw new Error(`groups: ${error.code}`);

  return (
    <PageContainer>
      <PageHeader title={t("title")} intro={t("intro")} />
      {data.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <ul className="mt-6 list-none space-y-5 p-0">
          {data.map((g) => {
            const students = g.enrollments.filter((e) => ["active", "paused"].includes(e.status) && e.students).map((e) => e.students!);
            const next = g.sessions.filter((s) => s.status === "scheduled" && s.starts_at >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
            const rules = g.schedule_rules.filter((r) => r.active).sort((a, b) => a.weekday - b.weekday);
            return (
              <li key={g.id} className="rounded-lg border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-text">{g.name}</h2>
                    <p className="text-sm text-text-muted">
                      {g.programs ? (es ? g.programs.name_es : g.programs.name_en) : "—"} · {g.code}
                    </p>
                  </div>
                  <StatusBadge tone={TONES[g.status]}>{ts(`status.${g.status}`)}</StatusBadge>
                </div>
                <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="font-semibold text-text-muted">{t("schedule")}</dt>
                  <dd>{rules.length ? rules.map((r) => `${tw(`weekdays.${r.weekday}`)} ${r.start_time.slice(0, 5)}`).join(" · ") : t("noSchedule")}</dd>
                  <dt className="font-semibold text-text-muted">{t("where")}</dt>
                  <dd>
                    {g.locations?.name ?? t("noPlace")}
                    {g.location_note ? ` · ${g.location_note}` : ""}
                    {g.meeting_url ? (
                      <>
                        {" · "}
                        <a href={g.meeting_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-structure underline">
                          {t("online")}
                        </a>
                      </>
                    ) : null}
                  </dd>
                  <dt className="font-semibold text-text-muted">{t("next")}</dt>
                  <dd>{next ? `${formatDay(schoolToday(new Date(next.starts_at)), locale)} · ${formatSessionTime(next.starts_at, next.ends_at, locale)}` : t("noNext")}</dd>
                  <dt className="font-semibold text-text-muted">{t("seats")}</dt>
                  <dd>
                    {students.length}/{g.capacity}
                  </dd>
                </dl>
                <h3 className="mt-4 text-sm font-bold text-text-muted uppercase">{t("students")}</h3>
                {students.length === 0 ? (
                  <p className="mt-1 text-sm text-text-muted">{t("noStudents")}</p>
                ) : (
                  <ul className="mt-1 columns-1 gap-6 sm:columns-2">
                    {students.map((s) => (
                      <li key={s.id} className="py-0.5 text-text">
                        {s.full_name}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
                  <Link href={`/${locale}/teacher/calendar`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-structure underline">
                    <CalendarDays aria-hidden="true" className="size-5" strokeWidth={1.75} />
                    {t("seeCalendar")}
                  </Link>
                  <Link href={`/${locale}/teacher/attendance`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-structure underline">
                    <ClipboardCheck aria-hidden="true" className="size-5" strokeWidth={1.75} />
                    {t("seeAttendance")}
                  </Link>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
