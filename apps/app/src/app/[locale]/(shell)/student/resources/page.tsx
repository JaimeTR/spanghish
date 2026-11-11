import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PortalResources } from "@/components/content/PortalResources";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";

/** Recursos del alumno por nivel de acceso (ver PortalResources). */
export default async function StudentResourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "student");
  return <PortalResources locale={locale} />;
}
