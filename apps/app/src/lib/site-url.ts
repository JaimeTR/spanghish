import type { Locale } from "../i18n/routing";

/**
 * URL de /<locale>/reset-password a partir de la URL configurada del sitio
 * (NEXT_PUBLIC_SITE_URL). Nunca a partir de la cabecera Host. null si falta o
 * no es http(s).
 */
export function resetPasswordUrl(
  locale: Locale,
  site: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
): string | null {
  if (!site) return null;
  try {
    const url = new URL(`/${locale}/reset-password`, site);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
