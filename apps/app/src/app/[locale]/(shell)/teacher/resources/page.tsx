import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PortalResources } from "@/components/content/PortalResources";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";

/** Recursos de la docente: los mismos materiales que ve el alumno, con acceso completo (ver PortalResources). */
export default async function TeacherResourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "teacher");
  return <PortalResources locale={locale} showTests={false} />;
}
