import type { Locale } from "@/i18n/routing";

export type AppRole = "admin" | "teacher" | "student" | "guardian";
export type UserStatus = "active" | "suspended";

export type SessionUser = {
  id: string;
  roles: AppRole[];
  status: UserStatus;
  locale: Locale;
};

const ROLE_PRIORITY: readonly AppRole[] = ["admin", "teacher", "student", "guardian"];

export function roleHomePath(roles: AppRole[], locale: Locale): string {
  const role = ROLE_PRIORITY.find((r) => roles.includes(r));
  return role ? `/${locale}/${role}` : `/${locale}/login`;
}

export function canAccess(roles: AppRole[], path: string): boolean {
  // path = /<locale>/<area>/...
  const area = path.split(/[?#]/)[0]!.split("/")[2];
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

type ProfileRow = { id: string; status: UserStatus; preferred_locale: Locale };
type RoleRow = { role: AppRole };

/** Un usuario suspendido no tiene acceso: se descartan sus roles. */
export function toSessionUser(profile: ProfileRow, roleRows: RoleRow[]): SessionUser {
  const suspended = profile.status === "suspended";
  return {
    id: profile.id,
    roles: suspended ? [] : roleRows.map((r) => r.role),
    status: profile.status,
    locale: profile.preferred_locale,
  };
}
