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
  | "legal"
  | "tests"
  | "users"
  | "products"
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

/**
 * Módulo del menú lateral. `key` es la clave de traducción en `nav.items`. `href` es la ruta
 * sin locale (nav.test.ts comprueba que cada una exista).
 */
export type NavItem = {
  key: NavIcon;
  area: AppRole;
  href: string;
  icon: NavIcon;
};

/** Ruta real de un módulo ya construido (relativa al área; "" = portada). */
const ready =
  (area: AppRole) =>
  (key: NavIcon, path: string): NavItem => ({
    key,
    area,
    href: path ? `/${area}/${path}` : `/${area}`,
    icon: key,
  });

const a = { r: ready("admin") };
const t = { r: ready("teacher") };
const s = { r: ready("student") };
const g = { r: ready("guardian") };

/**
 * Menú completo de cada rol. Cada entrada apunta a su página real (nav.test.ts comprueba que exista).
 */
export const NAV: Record<AppRole, readonly NavItem[]> = {
  admin: [
    a.r("dashboard", ""),
    a.r("calendar", "calendar"),
    a.r("groups", "groups"),
    a.r("enrollments", "enrollments"),
    a.r("attendance", "attendance"),
    a.r("requests", "requests"),
    a.r("leads", "leads"),
    a.r("users", "users"),
    a.r("students", "students"),
    a.r("teachers", "teachers"),
    a.r("content", "resources"),
    a.r("lessons", "lessons"),
    a.r("tests", "tests"),
    a.r("catalog", "catalog"),
    a.r("products", "products"),
    a.r("payments", "payments"),
    a.r("legal", "legal"),
    a.r("settings", "settings"),
  ],
  teacher: [t.r("today", "today"), t.r("groups", "groups"), t.r("calendar", "calendar"), t.r("attendance", "attendance"), t.r("requests", "requests"), t.r("assignments", "assignments"), t.r("resources", "resources")],
  student: [
    s.r("home", ""),
    s.r("schedule", "schedule"),
    s.r("courses", "courses"),
    s.r("requests", "requests"),
    s.r("resources", "resources"),
    s.r("learn", "learn"),
    s.r("tests", "tests"),
    s.r("assignments", "assignments"),
    s.r("progress", "progress"),
    s.r("payments", "payments"),
  ],
  guardian: [g.r("children", "children"), g.r("schedule", "schedule"), g.r("payments", "payments"), g.r("consents", "consents"), g.r("resources", "resources")],
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
    requests: "operation",
    leads: "operation",
    users: "people",
    students: "people",
    teachers: "people",
    content: "content",
    lessons: "content",
    tests: "content",
    catalog: "management",
    products: "management",
    payments: "management",
    legal: "management",
    settings: "management",
  },
  teacher: {
    today: "classes",
    groups: "classes",
    calendar: "classes",
    attendance: "classes",
    requests: "classes",
    assignments: "classes",
    resources: "learn",
  },
  student: {
    schedule: "classes",
    courses: "classes",
    requests: "classes",
    resources: "learn",
    learn: "learn",
    tests: "learn",
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

/** Menú de un área partido en grupos, en el orden de `NAV`. Lo que no tiene grupo (la portada) va siempre arriba. */
export function navGroupsFor(role: AppRole): { group: NavGroup | null; items: NavItem[] }[] {
  const byGroup = new Map<NavGroup | null, NavItem[]>();
  for (const item of NAV[role]) {
    const group = GROUP_OF[role][item.key] ?? null;
    byGroup.set(group, [...(byGroup.get(group) ?? []), item]);
  }
  const groups = [...byGroup].map(([group, items]) => ({ group, items }));
  return groups
    .map((entry, index) => ({ entry, index }))
    .sort((x, y) => (x.entry.group === null ? 0 : 1) - (y.entry.group === null ? 0 : 1) || x.index - y.index)
    .map(({ entry }) => entry);
}

export function navItemsFor(role: AppRole): NavItem[] {
  return [...NAV[role]];
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
