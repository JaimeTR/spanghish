import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { WeekCalendar } from "@/components/classes/WeekCalendar";
import { PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";

/** Calendario semanal de la docente: sus clases (RLS), con asistencia y cancelar. */
export default async function TeacherCalendarPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ week?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "teacher");
  const t = await getTranslations({ locale, namespace: "classes.calendar" });
  const { week } = await searchParams;
  return (
    <PageContainer>
      <PageHeader title={t("title")} intro={t("introTeacher")} />
      <WeekCalendar locale={locale} week={week} base={`/${locale}/teacher/calendar`} attendanceBase={`/${locale}/teacher/attendance`} />
    </PageContainer>
  );
}
