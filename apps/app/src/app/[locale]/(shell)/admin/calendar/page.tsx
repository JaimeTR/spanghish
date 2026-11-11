import { Ban, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, RowActions, StatusBadge } from "@/components/admin/PageHeader";
import { SESSION_TONES } from "@/components/attendance/SessionRegister";
import { IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { listTeachers } from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDay, formatSessionTime, schoolDayRange, schoolToday, weekStart } from "@/lib/time";
import { CancelSessionForm, RestoreSession } from "./CalendarForms";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Calendario semanal: las clases de todos los grupos, con cancelar/reactivar y acceso a la asistencia. */
export default async function CalendarPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ week?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "classes.calendar" });
  const ts = await getTranslations({ locale, namespace: "classes" });
  const { week } = await searchParams;
  const today = schoolToday();
  const start = weekStart(week && DAY.test(week) ? week : today);
  const supabase = await createClient();
  const [sessionsRes, teachers] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, starts_at, ends_at, status, teacher_id, cancel_reason, groups(name, code), attendance(id)")
      .gte("starts_at", schoolDayRange(start).from)
      .lt("starts_at", schoolDayRange(addDays(start, 6)).to)
      .order("starts_at"),
    listTeachers(supabase),
  ]);
  if (sessionsRes.error) throw new Error(`sessions: ${sessionsRes.error.code}`);
  const teacherName = new Map(teachers.map((u) => [u.id, u.fullName ?? u.email ?? "—"]));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const base = `/${locale}/admin/calendar`;

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <nav aria-label={t("weekNav")} className="mt-6 flex flex-wrap items-center gap-2">
        <IconLink href={`${base}?week=${addDays(start, -7)}`} label={t("prevWeek")} icon={<ChevronLeft className="size-5" strokeWidth={2} />} />
        <span className="min-w-48 text-center font-semibold text-text">
          {formatDay(start, locale)} – {formatDay(addDays(start, 6), locale)}
        </span>
        <IconLink href={`${base}?week=${addDays(start, 7)}`} label={t("nextWeek")} icon={<ChevronRight className="size-5" strokeWidth={2} />} />
        <Link href={base} className="ml-2 inline-flex min-h-11 items-center font-semibold text-structure underline">
          {t("thisWeek")}
        </Link>
      </nav>
      <div className="mt-6 space-y-5">
        {days.map((day) => {
          const sessions = sessionsRes.data.filter((s) => schoolToday(new Date(s.starts_at)) === day);
          return (
            <section key={day} aria-labelledby={`day-${day}`}>
              <h2 id={`day-${day}`} className={`text-sm font-bold uppercase ${day === today ? "text-structure" : "text-text-muted"}`}>
                {new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-AU", { weekday: "long", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`))} · {formatDay(day, locale)}
                {day === today ? ` · ${t("today")}` : ""}
              </h2>
              {sessions.length === 0 ? (
                <p className="mt-1 text-sm text-text-muted">{t("noClasses")}</p>
              ) : (
                <ul className="mt-2 list-none divide-y divide-line rounded-lg border border-line bg-surface p-0">
                  {sessions.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3">
                      <span className="min-w-0">
                        <span className="block font-semibold text-text">
                          {formatSessionTime(s.starts_at, s.ends_at, locale)} · {s.groups?.name ?? "—"}
                        </span>
                        <span className="block text-sm text-text-muted">
                          {s.teacher_id ? (teacherName.get(s.teacher_id) ?? "—") : t("noTeacher")}
                          {s.status === "cancelled" && s.cancel_reason ? ` · ${s.cancel_reason}` : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusBadge tone={SESSION_TONES[s.status]}>{ts(`sessionStatus.${s.status}`)}</StatusBadge>
                        <RowActions>
                          {s.status !== "cancelled" ? (
                            <IconLink href={`/${locale}/admin/attendance/${s.id}`} label={t("attendance")} icon={<ClipboardCheck className="size-5" strokeWidth={1.75} />} />
                          ) : null}
                          {s.status === "cancelled" ? (
                            <RestoreSession locale={locale} sessionId={s.id} />
                          ) : (
                            <ModalButton iconOnly label={t("cancel")} title={t("cancelTitle")} icon={<Ban className="size-5" strokeWidth={1.75} />} size="md">
                              <CancelSessionForm locale={locale} sessionId={s.id} />
                            </ModalButton>
                          )}
                        </RowActions>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
