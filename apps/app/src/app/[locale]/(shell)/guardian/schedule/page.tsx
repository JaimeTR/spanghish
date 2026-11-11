import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StatusBadge } from "@/components/admin/PageHeader";
import { SESSION_TONES } from "@/components/attendance/SessionRegister";
import { EmptyState, HeroHeader, PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDay, formatSessionTime, schoolDayRange, schoolToday } from "@/lib/time";

/** Horario (tutor): las clases de los próximos 30 días de los grupos de sus hijos, con el nombre de cada hijo. */
export default async function GuardianSchedulePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "guardian");
  const t = await getTranslations({ locale, namespace: "guardian.schedule" });
  const ts = await getTranslations({ locale, namespace: "classes" });
  const supabase = await createClient();
  const today = schoolToday();
  const [sessions, enrollments] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, group_id, starts_at, ends_at, status, cancel_reason, groups(name, meeting_url, location_note, locations(name))")
      .gte("starts_at", schoolDayRange(today).from)
      .lt("starts_at", schoolDayRange(addDays(today, 30)).to)
      .order("starts_at")
      .limit(150),
    supabase.from("enrollments").select("group_id, students(full_name)").in("status", ["active", "paused"]),
  ]);
  if (sessions.error) throw new Error(`sessions: ${sessions.error.code}`);
  if (enrollments.error) throw new Error(`enrollments: ${enrollments.error.code}`);
  const kidsOf = (groupId: string) => enrollments.data.filter((e) => e.group_id === groupId).map((e) => e.students?.full_name).filter(Boolean).join(", ");

  return (
    <PageContainer>
      <HeroHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      {sessions.data.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <ul className="mt-8 list-none space-y-3 p-0">
          {sessions.data.map((s) => {
            const place = s.groups?.locations?.name ?? s.groups?.location_note;
            return (
              <li key={s.id} className="rounded-[var(--shape-lg)] border border-line border-l-4 border-l-brand-yellow bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-text">{kidsOf(s.group_id) || s.groups?.name || "—"}</p>
                    <p className="text-sm text-text-muted">
                      {s.groups?.name ?? "—"} · {formatDay(schoolToday(new Date(s.starts_at)), locale)} · {formatSessionTime(s.starts_at, s.ends_at, locale)}
                      {place ? ` · ${place}` : ""}
                    </p>
                  </div>
                  {s.status === "cancelled" ? <StatusBadge tone={SESSION_TONES.cancelled}>{ts("sessionStatus.cancelled")}</StatusBadge> : null}
                </div>
                {s.status === "cancelled" && s.cancel_reason ? <p className="mt-2 text-sm text-text-muted">{s.cancel_reason}</p> : null}
                {s.status !== "cancelled" && s.groups?.meeting_url ? (
                  <a href={s.groups.meeting_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center font-semibold text-structure underline">
                    {ts("joinOnline")}
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
