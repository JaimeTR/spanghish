import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PortalShell } from "@/components/PortalShell";
import { isLocale } from "@/i18n/routing";
import { displayName, roleHomePath, type AppRole } from "@/lib/access";
import { getSessionUser } from "@/lib/session";

const AREA_PRIORITY: readonly AppRole[] = ["admin", "teacher", "student", "guardian"];

/**
 * Mi cuenta y Configuración las ve cualquier persona con sesión, así que no
 * pertenecen a un área: se pintan dentro del shell del área de mayor prioridad
 * de sus roles (la misma a la que le lleva el inicio de sesión).
 */
export default async function AccountLayout({
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
  const area = user ? AREA_PRIORITY.find((role) => user.roles.includes(role)) : undefined;
  if (!user || !area) redirect(roleHomePath([], locale));
  return (
    <PortalShell area={area} locale={locale} name={displayName(user)} avatarPath={user.avatarPath} roles={user.roles}>
      {children}
    </PortalShell>
  );
}
