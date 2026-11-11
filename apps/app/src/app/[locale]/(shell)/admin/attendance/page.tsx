import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { SessionList } from "@/components/attendance/SessionList";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";

/** Asistencia: clases recientes y próximas; cada una abre su lista. */
export default async function AdminAttendancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "classes.attendance" });
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <SessionList locale={locale} base={`/${locale}/admin/attendance`} />
    </>
  );
}
