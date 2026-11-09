import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { InDevelopment } from "@/components/InDevelopment";
import { isLocale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { devModules } from "@/lib/nav";
import { requireArea } from "@/lib/require-area";

/**
 * `/<area>/<module>` de un módulo en desarrollo: comprueba el rol como cualquier
 * otra página del área y da 404 si la clave no es un módulo `dev` de esa área.
 * No consulta datos.
 */
export async function DevModulePage({
  params,
  area,
}: {
  params: Promise<{ locale: string; module: string }>;
  area: AppRole;
}) {
  const { locale, module } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, area);
  if (!devModules(area).includes(module)) notFound();
  return <InDevelopment area={area} module={module} locale={locale} />;
}
