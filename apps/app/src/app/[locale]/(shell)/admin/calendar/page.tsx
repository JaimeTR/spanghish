import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { WeekCalendar } from "@/components/classes/WeekCalendar";
import { isLocale } from "@/i18n/routing";
import { listTeachers } from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";

/** Calendario semanal de administración: las clases de todos los grupos. */
export default async function CalendarPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ week?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "classes.calendar" });
  const { week } = await searchParams;
  const teachers = await listTeachers(await createClient());
  const teacherNames = new Map(teachers.map((u) => [u.id, u.fullName ?? u.email ?? "—"]));
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <WeekCalendar locale={locale} week={week} base={`/${locale}/admin/calendar`} attendanceBase={`/${locale}/admin/attendance`} teacherNames={teacherNames} />
    </>
  );
}
