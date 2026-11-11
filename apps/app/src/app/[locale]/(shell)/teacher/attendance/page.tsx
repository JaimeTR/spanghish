import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { SessionList } from "@/components/attendance/SessionList";
import { PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";

/** Asistencia (docente): sus clases recientes y próximas. */
export default async function TeacherAttendancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "teacher");
  const t = await getTranslations({ locale, namespace: "classes.attendance" });
  return (
    <PageContainer>
      <PageHeader title={t("title")} intro={t("introTeacher")} />
      <SessionList locale={locale} base={`/${locale}/teacher/attendance`} />
    </PageContainer>
  );
}
