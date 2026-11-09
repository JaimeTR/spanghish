import type { Locale } from "../i18n/routing";
import { canAccess, type AppRole } from "./access";

export type NavIcon =
  | "dashboard"
  | "calendar"
  | "groups"
  | "enrollments"
  | "attendance"
  | "payments"
  | "leads"
  | "catalog"
  | "students"
  | "teachers"
  | "content"
  | "settings"
  | "today"
  | "resources"
  | "lessons"
  | "learn"
  | "requests"
  | "home"
  | "schedule"
  | "courses"
  | "assignments"
  | "progress"
  | "children"
  | "consents";

/** `ready`: el módulo existe. `dev`: se muestra con la etiqueta "En desarrollo". */
export type ModuleStatus = "ready" | "dev";

/**
 * Módulo del menú lateral. `key` es la clave de traducción en `nav.items` (y,
 * si está en desarrollo, en `devModules.<area>.<key>`). `href` es la ruta sin
 * locale: la real si está `ready`, `/<area>/<key>` (página "En desarrollo") si no.
 */
export type NavItem = {
  key: NavIcon;
  area: AppRole;
  status: ModuleStatus;
  href: string;
  icon: NavIcon;
};

/** Ruta real de un módulo ya construido (relativa al área; "" = portada). */
const ready =
  (area: AppRole) =>
  (key: NavIcon, path: string): NavItem => ({
    key,
    area,
    status: "ready",
    href: path ? `/${area}/${path}` : `/${area}`,
    icon: key,
  });

const dev =
  (area: AppRole) =>
  (key: NavIcon): NavItem => ({ key, area, status: "dev", href: `/${area}/${key}`, icon: key });

const a = { r: ready("admin"), d: dev("admin") };
const t = { r: ready("teacher"), d: dev("teacher") };
const s = { r: ready("student"), d: dev("student") };
const g = { r: ready("guardian"), d: dev("guardian") };

/**
 * Menú completo de cada rol, con todo lo que tendrá el portal. Cada tarea que
 * construya un módulo cambia su entrada a `ready` con su ruta real (nav.test.ts
 * comprueba que la ruta exista).
 */
export const NAV: Record<AppRole, readonly NavItem[]> = {
  admin: [
    a.r("dashboard", ""),
    a.d("calendar"),
    a.d("groups"),
    a.d("enrollments"),
    a.d("attendance"),
    a.d("leads"),
    a.r("students", "students"),
    a.r("teachers", "teachers"),
    a.r("content", "resources"),
    a.r("lessons", "lessons"),
    a.r("catalog", "catalog"),
    a.d("payments"),
    a.r("settings", "settings/consent-texts"),
  ],
  teacher: [t.d("today"), t.d("groups"), t.d("calendar"), t.d("attendance"), t.d("requests"), t.d("resources")],
  student: [
    s.r("home", ""),
    s.d("schedule"),
    s.d("courses"),
    s.d("requests"),
    s.d("resources"),
    s.d("learn"),
    s.d("assignments"),
    s.d("progress"),
    s.d("payments"),
  ],
  guardian: [g.d("children"), g.d("schedule"), g.d("payments"), g.d("consents"), g.d("resources")],
};

/** Grupos del menú lateral (claves de `nav.groups`). `null` = sin título, arriba del todo. */
export type NavGroup = "operation" | "people" | "content" | "management" | "classes" | "learn" | "family" | "account";

/** A qué grupo pertenece cada módulo, por área. Lo que no aparece va sin título. */
const GROUP_OF: Record<AppRole, Partial<Record<NavIcon, NavGroup>>> = {
  admin: {
    calendar: "operation",
    groups: "operation",
    enrollments: "operation",
    attendance: "operation",
    leads: "operation",
    students: "people",
    teachers: "people",
    content: "content",
    lessons: "content",
    catalog: "management",
    payments: "management",
    settings: "management",
  },
  teacher: {
    today: "classes",
    groups: "classes",
    calendar: "classes",
    attendance: "classes",
    requests: "classes",
    resources: "learn",
  },
  student: {
    schedule: "classes",
    courses: "classes",
    requests: "classes",
    resources: "learn",
    learn: "learn",
    assignments: "learn",
    progress: "learn",
    payments: "account",
  },
  guardian: {
    children: "family",
    schedule: "family",
    payments: "family",
    consents: "family",
    resources: "learn",
  },
};

/** Menú de un área partido en grupos consecutivos, en el orden de `NAV`. */
export function navGroupsFor(role: AppRole): { group: NavGroup | null; items: NavItem[] }[] {
  const groups: { group: NavGroup | null; items: NavItem[] }[] = [];
  for (const item of NAV[role]) {
    const group = GROUP_OF[role][item.key] ?? null;
    const last = groups[groups.length - 1];
    if (last && last.group === group) last.items.push(item);
    else groups.push({ group, items: [item] });
  }
  return groups;
}

export function navItemsFor(role: AppRole): NavItem[] {
  return [...NAV[role]];
}

/** Claves de los módulos en desarrollo de un área (las que admite `/<area>/[module]`). */
export function devModules(area: AppRole): string[] {
  return NAV[area].filter((i) => i.status === "dev").map((i) => i.key);
}

/** Ruta con locale de un elemento del menú. */
export function navUrl(item: NavItem, locale: Locale): string {
  return `/${locale}${item.href}`;
}

const home =
  (area: AppRole) =>
  (locale: Locale): string =>
    `/${locale}/${area}`;

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
