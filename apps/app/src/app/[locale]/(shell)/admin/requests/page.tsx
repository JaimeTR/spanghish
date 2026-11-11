import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { ChangeRequestsBoard } from "@/components/classes/ChangeRequestsBoard";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";

/** Cambios de clase (administración): todos los avisos y pedidos de los alumnos. Decide quien los atienda. */
export default async function AdminRequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "classes.requests" });
  return (
    <>
      <PageHeader title={t("title")} intro={t("introAdmin")} />
      <ChangeRequestsBoard locale={locale} />
    </>
  );
}
