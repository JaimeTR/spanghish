import { isLocale, routing } from "../i18n/routing";
import { canAccess, isSafeRedirect, roleHomePath, type AppRole, type UserStatus } from "./access";

export type GuardUser = { roles: AppRole[]; status: UserStatus } | null;

export type GuardDecision =
  | { kind: "allow" }
  | { kind: "reject" }
  | { kind: "redirect"; to: string; signOut?: true };

const PROTECTED_AREAS: readonly string[] = ["admin", "teacher", "student", "guardian"];
const CONTROL_OR_SEPARATOR = /[\u0000-\u001f\u007f/\\]/;

/**
 * Endurece canAccess: true si algún segmento (decodificado) es `.` o `..`,
 * contiene caracteres de control o separadores codificados (%2F, %5C), o tiene
 * una codificación inválida. Se evalúa sobre el pathname crudo.
 */
export function hasUnsafeSegment(pathname: string): boolean {
  for (const raw of pathname.split("/")) {
    if (raw === "") continue;
    let segment: string;
    try {
      segment = decodeURIComponent(raw);
    } catch {
      return true;
    }
    if (segment === "." || segment === ".." || CONTROL_OR_SEPARATOR.test(segment)) return true;
  }
  return false;
}

/** `next` solo se usa si es una ruta interna segura y el usuario puede verla. */
export function safeNextTarget(next: string | null | undefined, roles: AppRole[]): string | null {
  if (!next || !isSafeRedirect(next)) return null;
  const pathname = next.split(/[?#]/)[0]!;
  if (hasUnsafeSegment(pathname)) return null;
  return canAccess(roles, next) ? next : null;
}

function segments(pathname: string): string[] {
  return pathname
    .split("/")
    .filter((s) => s !== "")
    .map((s) => decodeURIComponent(s).toLowerCase());
}

/**
 * Decisión de acceso del proxy (pura). `pathname` es el crudo de la petición;
 * `search` incluye el "?" si existe. `user` null = sin sesión.
 */
export function guardRequest(pathname: string, search: string, user: GuardUser): GuardDecision {
  if (hasUnsafeSegment(pathname)) return { kind: "reject" };

  const [locale, area] = segments(pathname);
  if (!locale || !isLocale(locale)) {
    return { kind: "redirect", to: `/${routing.defaultLocale}/login` };
  }

  if (user?.status === "suspended") {
    return { kind: "redirect", to: `/${locale}/login?error=suspended`, signOut: true };
  }

  if (!area || !PROTECTED_AREAS.includes(area)) return { kind: "allow" };

  if (!user) {
    const next = pathname + search;
    const query = isSafeRedirect(next) ? `?${new URLSearchParams({ next })}` : "";
    return { kind: "redirect", to: `/${locale}/login${query}` };
  }

  if (!canAccess(user.roles, pathname)) {
    return { kind: "redirect", to: roleHomePath(user.roles, locale) };
  }
  return { kind: "allow" };
}
