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
    a.r("calendar", "calendar"),
    a.r("groups", "groups"),
    a.r("enrollments", "enrollments"),
    a.r("attendance", "attendance"),
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
  teacher: [t.r("today", "today"), t.r("groups", "groups"), t.r("calendar", "calendar"), t.r("attendance", "attendance"), t.r("requests", "requests"), t.r("resources", "resources")],
  student: [
    s.r("home", ""),
    s.r("schedule", "schedule"),
    s.r("courses", "courses"),
    s.r("requests", "requests"),
    s.r("resources", "resources"),
    s.r("learn", "learn"),
    s.r("tests", "tests"),
    s.d("assignments"),
    s.d("progress"),
    s.r("payments", "payments"),
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

/**
 * Menú de un área partido en grupos. Lo ya construido va arriba y lo que sigue
 * en desarrollo, abajo: dentro de cada grupo los módulos listos van primero, y
 * los grupos que solo tienen módulos en desarrollo van al final. El resto del
 * orden es el de `NAV`. Lo que no tiene grupo (la portada) va siempre arriba.
 */
export function navGroupsFor(role: AppRole): { group: NavGroup | null; items: NavItem[] }[] {
  const byGroup = new Map<NavGroup | null, NavItem[]>();
  for (const item of NAV[role]) {
    const group = GROUP_OF[role][item.key] ?? null;
    byGroup.set(group, [...(byGroup.get(group) ?? []), item]);
  }
  const groups = [...byGroup].map(([group, items]) => ({
    group,
    // Estable: dentro de cada estado se conserva el orden de NAV.
    items: [...items.filter((i) => i.status === "ready"), ...items.filter((i) => i.status === "dev")],
  }));
  const rank = ({ group, items }: (typeof groups)[number]) => (group === null ? 0 : items.some((i) => i.status === "ready") ? 1 : 2);
  return groups
    .map((entry, index) => ({ entry, index }))
    .sort((x, y) => rank(x.entry) - rank(y.entry) || x.index - y.index)
    .map(({ entry }) => entry);
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
