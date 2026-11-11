import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StatusBadge } from "@/components/admin/PageHeader";
import { SESSION_TONES } from "@/components/attendance/SessionRegister";
import { EmptyState, HeroHeader, PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDay, formatSessionTime, schoolDayRange, schoolToday } from "@/lib/time";

/** Mi horario: las próximas clases de mis grupos (RLS: solo donde estoy matriculado), 30 días. */
export default async function StudentSchedulePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "student");
  const t = await getTranslations({ locale, namespace: "classes" });
  const today = schoolToday();
  const { data, error } = await (await createClient())
    .from("sessions")
    .select("id, starts_at, ends_at, status, cancel_reason, groups(name, meeting_url, location_note, locations(name))")
    .gte("starts_at", schoolDayRange(today).from)
    .lt("starts_at", schoolDayRange(addDays(today, 30)).to)
    .order("starts_at")
    .limit(100);
  if (error) throw new Error(`sessions: ${error.code}`);

  return (
    <PageContainer>
      <HeroHeader eyebrow={t("eyebrow")} title={t("schedule.title")} lead={t("schedule.lead")} />
      {data.length === 0 ? (
        <EmptyState>{t("schedule.empty")}</EmptyState>
      ) : (
        <ul className="mt-8 list-none space-y-3 p-0">
          {data.map((s) => {
            const place = s.groups?.locations?.name ?? s.groups?.location_note;
            return (
              <li key={s.id} className="rounded-[var(--shape-lg)] border border-line border-l-4 border-l-brand-yellow bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-text">{s.groups?.name ?? "—"}</p>
                    <p className="text-sm text-text-muted">
                      {formatDay(schoolToday(new Date(s.starts_at)), locale)} · {formatSessionTime(s.starts_at, s.ends_at, locale)}
                      {place ? ` · ${place}` : ""}
                    </p>
                  </div>
                  {s.status === "cancelled" ? <StatusBadge tone={SESSION_TONES.cancelled}>{t("sessionStatus.cancelled")}</StatusBadge> : null}
                </div>
                {s.status === "cancelled" && s.cancel_reason ? <p className="mt-2 text-sm text-text-muted">{s.cancel_reason}</p> : null}
                {s.status !== "cancelled" && s.groups?.meeting_url ? (
                  <a href={s.groups.meeting_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center font-semibold text-structure underline">
                    {t("joinOnline")}
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
