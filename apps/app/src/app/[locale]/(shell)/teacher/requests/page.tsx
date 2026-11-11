import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { ChangeRequestsBoard } from "@/components/classes/ChangeRequestsBoard";
import { PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";

/** Cambios de clase (docente): avisos y pedidos de los alumnos de sus clases, para aprobar o rechazar. */
export default async function TeacherRequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "teacher");
  const t = await getTranslations({ locale, namespace: "classes.requests" });
  return (
    <PageContainer>
      <PageHeader title={t("title")} intro={t("introTeacher")} />
      <ChangeRequestsBoard locale={locale} />
    </PageContainer>
  );
}
