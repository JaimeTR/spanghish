import type { Metadata, MetadataRoute } from "next";
import { routing, type Locale } from "../i18n/routing";
import { languageAlternates, localePath, ROUTE_KEYS, type RouteKey } from "./routes";
import { SITE_URL } from "./site";

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
}: {
  locale: Locale;
  route: RouteKey;
  title: string;
  description: string;
  ogAlt: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: localePath(locale, route), languages: languageAlternates(route) },
    openGraph: {
      type: "website",
      siteName: "Spanglish",
      locale: locale === "es" ? "es_AU" : "en_AU",
      alternateLocale: locale === "es" ? ["en_AU"] : ["es_AU"],
      url: localePath(locale, route),
      title,
      description,
      images: [{ ...OG_IMAGE, alt: ogAlt }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Prioridad orientativa para el sitemap: la home y las clases primero. */
const PRIORITY: Record<RouteKey, number> = {
  home: 1,
  lessons: 0.9,
  adults: 0.9,
  kids: 0.9,
  mature: 0.9,
  contact: 0.8,
  teachers: 0.7,
};

/** Una entrada por ruta e idioma, cada una con sus alternativas hreflang. */
export function sitemapEntries(baseUrl: string = SITE_URL, lastModified?: Date): MetadataRoute.Sitemap {
  const abs = (path: string) => `${baseUrl}${path}`;
  return ROUTE_KEYS.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: abs(localePath(locale, route)),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "monthly" as const,
      priority: PRIORITY[route],
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, abs(localePath(l, route))])),
      },
    })),
  );
}
