import type { Locale } from "../i18n/routing";
import { canAccess, type AppRole } from "./access";

export type NavIcon =
  | "dashboard"
  | "calendar"
  | "groups"
  | "students"
  | "teachers"
  | "leads"
  | "requests"
  | "catalog"
  | "languages"
  | "today"
  | "learning"
  | "schedule"
  | "library"
  | "overview";

/**
 * Elemento de navegación. `href` es null mientras la ruta no exista: se muestra
 * como "Pronto" y nunca como enlace (no puede llevar a un 404).
 * `key` es la clave de traducción en `nav.items`.
 */
export type NavItem = {
  key: NavIcon;
  icon: NavIcon;
  href: ((locale: Locale) => string) | null;
};

const home =
  (area: AppRole) =>
  (locale: Locale): string =>
    `/${locale}/${area}`;

const item = (key: NavIcon, href: NavItem["href"] = null): NavItem => ({ key, icon: key, href });

const adminPath =
  (path: string) =>
  (locale: Locale): string =>
    `/${locale}/admin/${path}`;

// Cada tarea de UI activa el href de su elemento cuando su ruta existe.
const NAV: Record<AppRole, readonly NavItem[]> = {
  admin: [
    item("dashboard", home("admin")),
    item("calendar"),
    item("groups"),
    item("students", adminPath("students")),
    item("teachers", adminPath("teachers")),
    item("leads"),
    item("requests"),
    item("catalog", adminPath("catalog")),
    item("languages"),
  ],
  teacher: [item("today", home("teacher")), item("groups"), item("requests")],
  student: [item("learning", home("student")), item("schedule"), item("library")],
  guardian: [item("overview", home("guardian"))],
};

export function navItemsFor(role: AppRole): NavItem[] {
  return [...NAV[role]];
}

/** Orden en el selector de área (mismo que la prioridad de roles). */
export const AREA_ORDER: readonly AppRole[] = ["admin", "teacher", "student", "guardian"];

/**
 * Áreas a las que la persona puede cambiar: solo sus propios roles, y además
 * solo si canAccess lo permite (defensa en profundidad). Una admin no ve las
 * áreas de los demás roles aunque canAccess se lo permita.
 */
export function switchableAreas(
  roles: AppRole[],
  locale: Locale,
): { area: AppRole; href: string }[] {
  return AREA_ORDER.filter((area) => roles.includes(area))
    .map((area) => ({ area, href: home(area)(locale) }))
    .filter(({ href }) => canAccess(roles, href));
}
