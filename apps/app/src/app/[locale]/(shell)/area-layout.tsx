import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { requireArea } from "@/lib/require-area";

/**
 * Layout de cada zona por rol: comprueba el rol para TODAS sus subpáginas, de
 * modo que una página nueva no pueda olvidarlo. Las páginas mantienen además su
 * propia comprobación (getSessionUser está cacheado por petición).
 */
export async function AreaLayout({
  children,
  params,
  area,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
  area: AppRole;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireArea(locale, area);
  return <>{children}</>;
}
