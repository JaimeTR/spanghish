import { isLocale, type Locale } from "../i18n/routing";

export type AppRole = "admin" | "teacher" | "student" | "guardian";
export type UserStatus = "active" | "suspended";
/** Estado de sesión: el de la base de datos o "no_profile" (cuenta sin perfil). */
export type SessionStatus = UserStatus | "no_profile";

export type SessionUser = {
  id: string;
  roles: AppRole[];
  status: SessionStatus;
  locale: Locale;
  /** profiles.full_name recortado; ausente si está vacío. Solo para mostrar. */
  name?: string;
  /** profiles.email recortado; ausente si está vacío. Solo para mostrar (respaldo del nombre). */
  email?: string;
  /** profiles.avatar_path: foto de perfil en el bucket público; ausente si no hay. */
  avatarPath?: string;
};

/** Nombre para la interfaz: el nombre y, si no lo hay, el correo. */
export function displayName(user: Pick<SessionUser, "name" | "email">): string | undefined {
  return user.name ?? user.email;
}

const ROLE_PRIORITY: readonly AppRole[] = ["admin", "teacher", "student", "guardian"];

export function roleHomePath(roles: AppRole[], locale: Locale): string {
  const role = ROLE_PRIORITY.find((r) => roles.includes(r));
  return role ? `/${locale}/${role}` : `/${locale}/login`;
}

/**
 * Falla cerrado: path = /<locale>/<area>/...
 * - El proxy debe ejecutar next-intl primero y pasar el pathname crudo.
 * - Los layouts de servidor deben seguir llamando a getSessionUser (defensa en
 *   profundidad; se hace en la Tarea 8).
 * Reglas: se normaliza (sin query/hash, decodificado, sin segmentos vacíos,
 * minúsculas). Sin locale válido o con codificación inválida -> false. El
 * segundo segmento decide el área; cualquier otro (o ninguno) es público. Un
 * nombre de área en segmentos posteriores (/es/foo/admin) es solo una ruta anidada.
 */
export function canAccess(roles: AppRole[], path: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path.split(/[?#]/)[0]!);
  } catch {
    return false;
  }
  const [locale, area] = decoded
    .split("/")
    .filter((s) => s !== "")
    .map((s) => s.toLowerCase());
  if (!locale || !isLocale(locale)) return false;
  if (area === "admin") return roles.includes("admin");
  if (area === "teacher" || area === "student" || area === "guardian") {
    return roles.includes(area) || roles.includes("admin");
  }
  return true;
}

export function isSafeRedirect(next: string | null): boolean {
  if (!next) return false;
  if (!next.startsWith("/") || next.startsWith("//")) return false;
  return !/[\\\u0000-\u001f\u007f]/.test(next);
}

// Columnas text de profiles (tipos generados): se validan aquí.
type ProfileRow = {
  id: string;
  status: string;
  preferred_locale: string;
  full_name?: string | null;
  email?: string | null;
  avatar_path?: string | null;
};
type RoleRow = { role: AppRole };

/**
 * Un usuario suspendido no tiene acceso: se descartan sus roles. Falla cerrado:
 * cualquier estado distinto de "active" cuenta como suspendido.
 */
export function toSessionUser(profile: ProfileRow, roleRows: RoleRow[]): SessionUser {
  const status: UserStatus = profile.status === "active" ? "active" : "suspended";
  const suspended = status === "suspended";
  const name = profile.full_name?.trim();
  const email = profile.email?.trim();
  return {
    id: profile.id,
    roles: suspended
      ? []
      : roleRows.map((r) => r.role).filter((r): r is AppRole => ROLE_PRIORITY.includes(r)),
    status,
    locale: isLocale(profile.preferred_locale) ? profile.preferred_locale : "es",
    ...(name && !suspended ? { name } : {}),
    ...(email && !suspended ? { email } : {}),
    ...(profile.avatar_path && !suspended ? { avatarPath: profile.avatar_path } : {}),
  };
}
