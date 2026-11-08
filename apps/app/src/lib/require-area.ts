import "server-only";
import { redirect } from "next/navigation";
import type { Locale } from "../i18n/routing";
import { canAccess, roleHomePath, type AppRole, type SessionUser } from "./access";
import { getSessionUser } from "./session";

/**
 * Defensa en profundidad: cada página privada comprueba sesión y rol en el
 * servidor aunque el proxy ya lo haya hecho.
 */
export async function requireArea(locale: Locale, area: AppRole): Promise<SessionUser> {
  const user = await getSessionUser();
  const path = `/${locale}/${area}`;
  if (!user) redirect(`/${locale}/login?${new URLSearchParams({ next: path })}`);
  // El proxy cierra la sesión del suspendido; aquí solo se le niega el acceso.
  if (user.status === "suspended") redirect(`/${locale}/login?error=suspended`);
  if (!canAccess(user.roles, path)) redirect(roleHomePath(user.roles, locale));
  return user;
}
