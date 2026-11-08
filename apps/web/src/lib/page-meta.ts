import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { isLocale, type Locale } from "@/i18n/routing";
import { localePath, type RouteKey } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export type PageProps = { params: Promise<{ locale: string }> };

/**
 * Metadatos de una página interior a partir de `page.<namespace>.metaTitle` y
 * `metaDescription`. Devuelve {} si el idioma no existe (el layout da 404).
 */
export async function innerPageMetadata(params: PageProps["params"], route: RouteKey, namespace: string): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: `page.${namespace}` });
  const tm = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    route,
    title: t("metaTitle"),
    description: t("metaDescription"),
    ogAlt: tm("ogAlt"),
  });
}

/** Migas de pan en JSON-LD: Inicio > (Clases >) página. */
export async function crumbsJsonLd(locale: Locale, trail: { route: RouteKey; name: string }[]) {
  const tn = await getTranslations({ locale, namespace: "nav" });
  return breadcrumbJsonLd([
    { name: tn("homeCrumb"), path: localePath(locale, "home") },
    ...trail.map((c) => ({ name: c.name, path: localePath(locale, c.route) })),
  ]);
}
