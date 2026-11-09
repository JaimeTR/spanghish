import type { Metadata, MetadataRoute } from "next";
import { routing, type Locale } from "../i18n/routing";
import { isIndexable, languageAlternates, localePath, ROUTE_KEYS, type RouteKey } from "./routes";
import { SITE_URL } from "./site";
import { TEACHERS, teacherPath } from "./teachers";

export const OG_IMAGE = { url: "/og-spanglish.png", width: 1200, height: 630 } as const;

/**
 * Metadatos de una página: título, descripción, canonical, hreflang es/en
 * (+ x-default) y Open Graph completo (Next no fusiona openGraph con el del
 * layout, así que la imagen se repite aquí).
 */
export function pageMetadata({
  locale,
  route,
  title,
  description,
  ogAlt,
  noindex = false,
  subpath,
}: {
  locale: Locale;
  route: RouteKey;
  title: string;
  description: string;
  ogAlt: string;
  /** Fuera de buscadores (se mantiene follow para que los enlaces cuenten). */
  noindex?: boolean;
  /** Página hija de la ruta (p. ej. el perfil de una docente: /teachers/<slug>). */
  subpath?: string;
}): Metadata {
  const pathFor = (l: Locale) => (subpath ? `${localePath(l, route)}/${subpath}` : localePath(l, route));
  const languages = subpath
    ? {
        ...Object.fromEntries(routing.locales.map((l) => [l, pathFor(l)])),
        "x-default": pathFor(routing.defaultLocale),
      }
    : languageAlternates(route);
  return {
    title,
    description,
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    alternates: { canonical: pathFor(locale), languages },
    openGraph: {
      type: "website",
      siteName: "Spanglish",
      locale: locale === "es" ? "es_AU" : "en_AU",
      alternateLocale: locale === "es" ? ["en_AU"] : ["es_AU"],
      url: pathFor(locale),
      title,
      description,
      images: [{ ...OG_IMAGE, alt: ogAlt }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Prioridad orientativa para el sitemap: la home, las clases y la reserva primero. */
const PRIORITY: Partial<Record<RouteKey, number>> = {
  home: 1,
  lessons: 0.9,
  adults: 0.9,
  kids: 0.9,
  mature: 0.9,
  online: 0.8,
  resources: 0.6,
  contact: 0.8,
  teachers: 0.7,
  bookings: 0.9,
  prices: 0.8,
  faq: 0.6,
  learn: 0.7,
  learnAlphabet: 0.6,
  learnNouns: 0.6,
  shop: 0.6,
};

/** Rutas del sitemap: todas menos las marcadas como noindex. */
export const SITEMAP_ROUTES = ROUTE_KEYS.filter(isIndexable);

/** Una entrada por ruta indexable e idioma, cada una con sus alternativas hreflang. */
export function sitemapEntries(
  baseUrl: string = SITE_URL,
  lastModified?: Date,
  /** Docentes publicadas (de la plataforma); por defecto, las del respaldo estático. */
  teacherSlugs: readonly string[] = TEACHERS.map((t) => t.slug),
): MetadataRoute.Sitemap {
  const abs = (path: string) => `${baseUrl}${path}`;
  const profiles = teacherSlugs.flatMap((slug) =>
    routing.locales.map((locale) => ({
      url: abs(teacherPath(locale, slug)),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, abs(teacherPath(l, slug))])),
      },
    })),
  );
  const routes = SITEMAP_ROUTES.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: abs(localePath(locale, route)),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "monthly" as const,
      priority: PRIORITY[route] ?? 0.5,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, abs(localePath(l, route))])),
      },
    })),
  );
  return [...routes, ...profiles];
}
