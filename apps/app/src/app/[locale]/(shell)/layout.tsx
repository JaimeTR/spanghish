import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { getSessionUser } from "@/lib/session";

/**
 * Puerta común de las zonas privadas: sin sesión o sin roles, al login.
 * El shell visual (barra lateral, barra superior) lo pinta cada layout de zona
 * (area-layout.tsx), que es quien conoce el área actual tras requireArea.
 */
export default async function ShellLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const user = await getSessionUser();
  if (!user || user.roles.length === 0) redirect(`/${locale}/login`);
  return <>{children}</>;
}
