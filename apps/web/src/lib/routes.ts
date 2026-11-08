import { routing, type Locale } from "../i18n/routing";

/**
 * Única fuente de verdad de las rutas públicas. Los slugs son los de la web
 * actual (spanglish.com.au) para conservar SEO y enlaces antiguos, y son
 * iguales en ambos idiomas: /es/adult-lessons y /en/adult-lessons.
 * Cada slug corresponde a la carpeta src/app/[locale]/<slug>/ (lo comprueba un test).
 */
export const ROUTES = {
  home: "",
  lessons: "lessons",
  adults: "adult-lessons",
  kids: "kids-lessons",
  mature: "mature-lessons",
  teachers: "teachers",
  contact: "contact-us",
} as const;

export type RouteKey = keyof typeof ROUTES;

export const ROUTE_KEYS = Object.keys(ROUTES) as RouteKey[];

/** Ruta con idioma: `localePath("en", "kids")` -> `/en/kids-lessons`; con ancla opcional. */
export function localePath(locale: Locale, route: RouteKey, hash?: string): string {
  const slug = ROUTES[route];
  const path = slug ? `/${locale}/${slug}` : `/${locale}`;
  return hash ? `${path}#${hash}` : path;
}

/** hreflang de una ruta: un enlace por idioma más x-default (idioma por defecto). */
export function languageAlternates(route: RouteKey): Record<string, string> {
  return {
    ...Object.fromEntries(routing.locales.map((l) => [l, localePath(l, route)])),
    "x-default": localePath(routing.defaultLocale, route),
  };
}

/** Destino de "Clase gratis" hasta que exista /bookings: la página de contacto. */
export function bookingPath(locale: Locale): string {
  return localePath(locale, "contact");
}

/** Navegación principal: rutas reales o anclas de la home (no hay páginas propias para ellas). */
export const HEADER_NAV = [
  { key: "lessons", route: "lessons" },
  { key: "how", route: "home", hash: "how" },
  { key: "prices", route: "home", hash: "prices" },
  { key: "teachers", route: "teachers" },
  { key: "contact", route: "contact" },
] as const satisfies readonly { key: string; route: RouteKey; hash?: string }[];

/** Pie: las páginas de clases por edad y las de la escuela. */
export const FOOTER_NAV = {
  lessons: [
    { key: "adults", route: "adults" },
    { key: "kids", route: "kids" },
    { key: "mature", route: "mature" },
  ],
  school: [
    { key: "lessons", route: "lessons" },
    { key: "teachers", route: "teachers" },
    { key: "contact", route: "contact" },
  ],
} as const satisfies Record<string, readonly { key: string; route: RouteKey }[]>;

export type HeaderNavKey = (typeof HEADER_NAV)[number]["key"];

/** Ruta activa en la cabecera para cada página (aria-current). */
export function activeNavKey(route: RouteKey): HeaderNavKey | undefined {
  if (route === "adults" || route === "kids" || route === "mature" || route === "lessons") return "lessons";
  if (route === "teachers") return "teachers";
  if (route === "contact") return "contact";
  return undefined;
}
