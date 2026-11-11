import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { SessionRegister } from "@/components/attendance/SessionRegister";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDay, formatSessionTime, schoolDayRange, schoolToday } from "@/lib/time";

/** Hoy (docente): las clases de hoy con la asistencia en un clic, y lo que viene en la semana. */
export default async function TeacherTodayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "teacher");
  const t = await getTranslations({ locale, namespace: "classes.today" });
  const supabase = await createClient();
  const today = schoolToday();
  const range = schoolDayRange(today);
  const [todays, upcoming] = await Promise.all([
    supabase.from("sessions").select("id").gte("starts_at", range.from).lt("starts_at", range.to).order("starts_at"),
    supabase
      .from("sessions")
      .select("id, starts_at, ends_at, status, groups(name)")
      .gte("starts_at", range.to)
      .lt("starts_at", schoolDayRange(addDays(today, 7)).to)
      .neq("status", "cancelled")
      .order("starts_at")
      .limit(30),
  ]);
  if (todays.error) throw new Error(`sessions: ${todays.error.code}`);
  if (upcoming.error) throw new Error(`sessions: ${upcoming.error.code}`);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader title={t("title")} intro={formatDay(today, locale)} />
      {todays.data.length === 0 ? (
        <p className="mt-8 rounded-xl bg-surface-sunken p-4 text-text-muted">{t("empty")}</p>
      ) : (
        <div className="mt-6 space-y-5">
          {todays.data.map((s) => (
            <SessionRegister key={s.id} locale={locale} sessionId={s.id} heading="h2" />
          ))}
        </div>
      )}
      {upcoming.data.length > 0 ? (
        <section aria-labelledby="today-upcoming" className="mt-10">
          <h2 id="today-upcoming" className="text-xl font-bold text-text">
            {t("upcoming")}
          </h2>
          <ul className="mt-3 list-none divide-y divide-line rounded-lg border border-line bg-surface p-0">
            {upcoming.data.map((s) => (
              <li key={s.id} className="flex flex-wrap justify-between gap-2 px-5 py-3">
                <span className="font-semibold text-text">{s.groups?.name ?? "—"}</span>
                <span className="text-sm text-text-muted">
                  {formatDay(schoolToday(new Date(s.starts_at)), locale)} · {formatSessionTime(s.starts_at, s.ends_at, locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="mt-8">
        <Link href={`/${locale}/teacher/attendance`} className="font-semibold text-structure underline">
          {t("seeAll")}
        </Link>
      </p>
    </div>
  );
}
