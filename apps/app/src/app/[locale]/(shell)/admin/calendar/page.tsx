import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { ClosuresManager } from "@/components/classes/ClosuresManager";
import { WeekCalendar } from "@/components/classes/WeekCalendar";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { listLocations } from "@/lib/data/catalog";
import { listTeachers } from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatDay, schoolToday } from "@/lib/time";

/** Calendario semanal de administración: las clases de todos los grupos. */
export default async function CalendarPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ week?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "classes.calendar" });
  const { week } = await searchParams;
  const supabase = await createClient();
  const [teachers, locations, closures] = await Promise.all([
    listTeachers(supabase),
    listLocations(supabase),
    supabase.from("closures").select("id, starts_on, ends_on, reason_es, reason_en, locations(name)").gte("ends_on", schoolToday()).order("starts_on").limit(100),
  ]);
  if (closures.error) throw new Error(`closures: ${closures.error.code}`);
  const tc = await getTranslations({ locale, namespace: "classes.closures" });
  const teacherNames = new Map(teachers.map((u) => [u.id, u.fullName ?? u.email ?? "—"]));
  return (
    <>
      <PageHeader
        title={t("title")}
        intro={t("intro")}
        action={
          <ModalButton label={tc("button")} title={tc("title")} icon={<span aria-hidden="true">🚫</span>} size="md">
            <ClosuresManager
              locale={locale}
              locations={locations.filter((l) => l.active).map((l) => ({ id: l.id, name: l.name }))}
              closures={closures.data.map((c) => ({
                id: c.id,
                range: c.starts_on === c.ends_on ? formatDay(c.starts_on, locale) : `${formatDay(c.starts_on, locale)} – ${formatDay(c.ends_on, locale)}`,
                place: c.locations?.name ?? tc("allLocations"),
                reason: (locale === "es" ? c.reason_es : c.reason_en) ?? c.reason_es ?? c.reason_en ?? "",
              }))}
            />
          </ModalButton>
        }
      />
      <WeekCalendar locale={locale} week={week} base={`/${locale}/admin/calendar`} attendanceBase={`/${locale}/admin/attendance`} teacherNames={teacherNames} />
    </>
  );
}
