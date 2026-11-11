import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PortalResources } from "@/components/content/PortalResources";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";

/** Recursos del tutor: los materiales que ven sus hijos (content_tier cuenta a los tutores de un menor matriculado). */
export default async function GuardianResourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "guardian");
  return <PortalResources locale={locale} showTests={false} />;
}
