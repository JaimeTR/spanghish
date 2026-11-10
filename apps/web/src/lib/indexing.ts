import type { MetadataRoute } from "next";

type Env = Record<string, string | undefined>;

/**
 * ¿Pueden los buscadores indexar la web? Sí, salvo en un entorno de
 * demostración (SITE_NOINDEX=1), que queda entero fuera de los buscadores:
 * robots.txt lo prohíbe todo y cada respuesta lleva X-Robots-Tag.
 * Nunca definir SITE_NOINDEX en el sitio real.
 */
export function indexingEnabled(env: Env = process.env): boolean {
  return env.SITE_NOINDEX !== "1";
}

export function robotsRules(siteUrl: string, env: Env = process.env): MetadataRoute.Robots {
  if (!indexingEnabled(env)) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl };
}

export const NOINDEX_HEADER = { key: "X-Robots-Tag", value: "noindex, nofollow" } as const;

/** Cabeceras para next.config.ts: sin indexación, todas las respuestas llevan X-Robots-Tag. */
export function noindexHeaders(env: Env = process.env): { source: string; headers: { key: string; value: string }[] }[] {
  return indexingEnabled(env) ? [] : [{ source: "/:path*", headers: [{ ...NOINDEX_HEADER }] }];
}
