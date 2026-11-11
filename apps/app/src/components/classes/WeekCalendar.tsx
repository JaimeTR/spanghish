import { Ban, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RowActions, StatusBadge } from "@/components/admin/PageHeader";
import { SESSION_TONES } from "@/components/attendance/SessionRegister";
import { IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import type { Locale } from "@/i18n/routing";
import { listWeekClosures, listWeekSessions } from "@/lib/data/sessions";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDay, formatSessionTime, schoolToday, weekStart } from "@/lib/time";
import { CancelSessionForm, RestoreSession } from "./SessionActions";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Calendario semanal de clases, compartido por administración (todos los grupos) y docente (los
 * suyos: RLS ya filtra). `base` es la ruta de la página, para la navegación de semanas;
 * `attendanceBase`, la de la asistencia (`<base>/<id>`). `teacherNames` muestra quién da cada
 * clase (solo administración). Cancelar y reactivar los permite la base de datos a ambos roles.
 */
export async function WeekCalendar({
  locale,
  week,
  base,
  attendanceBase,
  teacherNames,
}: {
  locale: Locale;
  week?: string;
  base: string;
  attendanceBase: string;
  teacherNames?: Map<string, string>;
}) {
  const t = await getTranslations({ locale, namespace: "classes.calendar" });
  const ts = await getTranslations({ locale, namespace: "classes" });
  const today = schoolToday();
  const start = weekStart(week && DAY.test(week) ? week : today);
  const supabase = await createClient();
  const [sessions, closures] = await Promise.all([listWeekSessions(supabase, start), listWeekClosures(supabase, start)]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <>
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
          const ofDay = sessions.filter((s) => schoolToday(new Date(s.starts_at)) === day);
          const closed = closures.filter((c) => day >= c.starts_on && day <= c.ends_on);
          return (
            <section key={day} aria-labelledby={`day-${day}`}>
              <h2 id={`day-${day}`} className={`text-sm font-bold uppercase ${day === today ? "text-structure" : "text-text-muted"}`}>
                {new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-AU", { weekday: "long", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`))} · {formatDay(day, locale)}
                {day === today ? ` · ${t("today")}` : ""}
              </h2>
              {closed.map((c) => (
                <p key={c.id} className="mt-1 rounded-md bg-warning/15 px-3 py-1.5 text-sm font-semibold text-[color-mix(in_srgb,var(--role-warning)_78%,black)]">
                  {t("closed", { reason: (locale === "es" ? c.reason_es : c.reason_en) ?? c.reason_es ?? c.reason_en ?? t("closedNoReason"), place: c.locations?.name ?? t("allLocations") })}
                </p>
              ))}
              {ofDay.length === 0 ? (
                <p className="mt-1 text-sm text-text-muted">{t("noClasses")}</p>
              ) : (
                <ul className="mt-2 list-none divide-y divide-line rounded-lg border border-line bg-surface p-0">
                  {ofDay.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3">
                      <span className="min-w-0">
                        <span className="block font-semibold text-text">
                          {formatSessionTime(s.starts_at, s.ends_at, locale)} · {s.groups?.name ?? "—"}
                        </span>
                        <span className="block text-sm text-text-muted">
                          {teacherNames ? (s.teacher_id ? (teacherNames.get(s.teacher_id) ?? "—") : t("noTeacher")) : null}
                          {teacherNames && s.status === "cancelled" && s.cancel_reason ? " · " : ""}
                          {s.status === "cancelled" && s.cancel_reason ? s.cancel_reason : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusBadge tone={SESSION_TONES[s.status]}>{ts(`sessionStatus.${s.status}`)}</StatusBadge>
                        <RowActions>
                          {s.status !== "cancelled" ? (
                            <IconLink href={`${attendanceBase}/${s.id}`} label={t("attendance")} icon={<ClipboardCheck className="size-5" strokeWidth={1.75} />} />
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
