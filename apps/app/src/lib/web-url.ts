import type { Locale } from "../i18n/routing";

/**
 * Dirección de una página de la web pública (`NEXT_PUBLIC_WEB_URL`) en el idioma
 * dado, o null si no está configurada o no es http(s).
 */
export function webUrl(
  locale: Locale,
  path = "",
  base: string | undefined = process.env.NEXT_PUBLIC_WEB_URL,
): string | null {
  if (!base) return null;
  try {
    const url = new URL(`/${locale}${path ? `/${path.replace(/^\//, "")}` : ""}`, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
