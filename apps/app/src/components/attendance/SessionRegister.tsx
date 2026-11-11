import { getTranslations } from "next-intl/server";
import { StatusBadge } from "@/components/admin/PageHeader";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatSessionTime, schoolToday } from "@/lib/time";
import { AttendanceRegister, type RosterRow } from "./AttendanceRegister";

export const SESSION_TONES = { scheduled: "info", completed: "success", cancelled: "muted" } as const;

/** Una clase con su lista y la asistencia en un clic. null si la clase no existe o RLS no deja verla. */
export async function SessionRegister({ locale, sessionId, heading = "h2" }: { locale: Locale; sessionId: string; heading?: "h2" | "h3" }) {
  const supabase = await createClient();
  const t = await getTranslations({ locale, namespace: "classes" });
  const { data: session } = await supabase
    .from("sessions")
    .select("id, starts_at, ends_at, status, cancel_reason, groups(name, meeting_url, location_note, locations(name))")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return null;
  const roster = await supabase.rpc("session_roster", { p_session_id: sessionId });
  if (roster.error) throw new Error(`session_roster: ${roster.error.code}`);
  const rows: RosterRow[] = roster.data.map((r) => ({ studentId: r.student_id, name: r.full_name, status: r.status }));
  const H = heading;
  const day = schoolToday(new Date(session.starts_at));
  const place = session.groups?.locations?.name ?? session.groups?.location_note ?? null;

  return (
    <section aria-labelledby={`session-${session.id}`} className="rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <H id={`session-${session.id}`} className="text-lg font-bold text-text">
            {session.groups?.name ?? "—"}
          </H>
          <p className="text-sm text-text-muted">
            {formatDay(day, locale)} · {formatSessionTime(session.starts_at, session.ends_at, locale)}
            {place ? ` · ${place}` : ""}
          </p>
          {session.groups?.meeting_url ? (
            <a href={session.groups.meeting_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-structure underline">
              {t("joinOnline")}
            </a>
          ) : null}
        </div>
        <StatusBadge tone={SESSION_TONES[session.status]}>{t(`sessionStatus.${session.status}`)}</StatusBadge>
      </div>
      {session.status === "cancelled" ? (
        <p className="mt-4 text-text-muted">{t("cancelledNote", { reason: session.cancel_reason ?? "—" })}</p>
      ) : (
        <div className="mt-4">
          <AttendanceRegister locale={locale} sessionId={session.id} rows={rows} editable />
        </div>
      )}
    </section>
  );
}
