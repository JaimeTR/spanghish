import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PortalShell } from "@/components/PortalShell";
import { isLocale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { requireArea } from "@/lib/require-area";

/**
 * Layout de cada zona por rol: comprueba el rol para TODAS sus subpáginas, de
 * modo que una página nueva no pueda olvidarlo, y pinta el shell del portal con
 * el área ya verificada. Las páginas mantienen además su propia comprobación
 * (getSessionUser está cacheado por petición).
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
  setRequestLocale(locale);
  const user = await requireArea(locale, area);
  return (
    <PortalShell area={area} locale={locale} name={user.name} roles={user.roles}>
      {children}
    </PortalShell>
  );
}
