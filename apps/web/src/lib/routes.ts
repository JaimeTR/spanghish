import { routing, type Locale } from "../i18n/routing";

/**
 * Única fuente de verdad de las rutas públicas. Los slugs son los de la web
 * actual (spanglish.com.au) para conservar SEO y enlaces antiguos, y son
 * iguales en ambos idiomas: /es/adult-lessons y /en/adult-lessons.
 * Cada slug corresponde a la carpeta src/app/[locale]/<slug>/ (lo comprueba un test);
 * los slugs anidados (learn/alphabet) son subcarpetas.
 */
export const ROUTES = {
  home: "",
  lessons: "lessons",
  adults: "adult-lessons",
  kids: "kids-lessons",
  mature: "mature-lessons",
  online: "online-conversations",
  resources: "resources",
  teachers: "teachers",
  contact: "contact-us",
  bookings: "bookings",
  thankYou: "thank-you",
  faq: "faq",
  prices: "prices",
  privacy: "privacy-policy",
  terms: "terms",
  learn: "learn",
  learnAlphabet: "learn/alphabet",
  learnNouns: "learn/nouns-and-articles",
  shop: "shop",
  shopSuccess: "shop/success",
} as const;

export type RouteKey = keyof typeof ROUTES;

export const ROUTE_KEYS = Object.keys(ROUTES) as RouteKey[];

/**
 * Rutas que no se indexan ni van al sitemap: las confirmaciones (solicitud y
 * pago; no tiene sentido llegar desde un buscador) y los textos legales,
 * pendientes de revisión del propietario/abogado antes de publicarse como definitivos.
 */
export const NOINDEX_ROUTES = ["thankYou", "privacy", "terms", "shopSuccess"] as const satisfies readonly RouteKey[];

export function isIndexable(route: RouteKey): boolean {
  return !(NOINDEX_ROUTES as readonly RouteKey[]).includes(route);
}

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

/** Destino de todos los "Clase gratis": el formulario de solicitud. */
export function bookingPath(locale: Locale): string {
  return localePath(locale, "bookings");
}

/** Subpágina de un grupo de la cabecera (p. ej. las clases por público). */
export type NavChild = { key: string; route: RouteKey };

/**
 * Navegación principal: solo páginas importantes (nada que lleve a una sección).
 * "Clases" y "Recursos" agrupan sus subpáginas: el enlace va a la página del
 * grupo y un botón aparte despliega el resto (patrón disclosure).
 */
export const HEADER_NAV = [
  {
    key: "lessons",
    route: "lessons",
    children: [
      { key: "allLessons", route: "lessons" },
      { key: "adultsShort", route: "adults" },
      { key: "kidsShort", route: "kids" },
      { key: "matureShort", route: "mature" },
      { key: "online", route: "online" },
    ],
  },
  { key: "prices", route: "prices" },
  {
    key: "resources",
    route: "resources",
    children: [
      { key: "allResources", route: "resources" },
      { key: "learn", route: "learn" },
      { key: "shop", route: "shop" },
    ],
  },
  { key: "faq", route: "faq" },
  { key: "teachers", route: "teachers" },
  { key: "contact", route: "contact" },
] as const satisfies readonly { key: string; route: RouteKey; children?: readonly NavChild[] }[];

/** Pie: las páginas de clases (por edad y la conversación online), las de la escuela y los textos legales. */
export const FOOTER_NAV = {
  lessons: [
    { key: "adults", route: "adults" },
    { key: "kids", route: "kids" },
    { key: "mature", route: "mature" },
    { key: "online", route: "online" },
    { key: "prices", route: "prices" },
  ],
  school: [
    { key: "lessons", route: "lessons" },
    { key: "teachers", route: "teachers" },
    { key: "faq", route: "faq" },
    { key: "resources", route: "resources" },
    { key: "learn", route: "learn" },
    { key: "shop", route: "shop" },
    { key: "contact", route: "contact" },
    { key: "bookings", route: "bookings" },
  ],
  legal: [
    { key: "privacy", route: "privacy" },
    { key: "terms", route: "terms" },
  ],
} as const satisfies Record<string, readonly { key: string; route: RouteKey }[]>;

export type HeaderNavKey = (typeof HEADER_NAV)[number]["key"];

/**
 * Página "padre" de las que no están en la navegación: las lecciones cuelgan de
 * Aprende ahora y la confirmación del pago, de la tienda.
 */
const NAV_PARENT: Partial<Record<RouteKey, RouteKey>> = {
  learnAlphabet: "learn",
  learnNouns: "learn",
  shopSuccess: "shop",
};

/** Ruta que representa a `route` en la navegación (ella misma o su padre). */
export function navRoute(route: RouteKey): RouteKey {
  return NAV_PARENT[route] ?? route;
}

/** Ruta activa en la cabecera para cada página (aria-current). */
export function activeNavKey(route: RouteKey): HeaderNavKey | undefined {
  const r = navRoute(route);
  for (const item of HEADER_NAV) {
    if (item.route === r) return item.key;
    if ("children" in item && item.children.some((c) => c.route === r)) return item.key;
  }
  return undefined;
}
