import { isLocale, type Locale } from "../i18n/routing";

/**
 * Misma ruta en otro idioma: sustituye el primer segmento si es un locale, o lo
 * antepone si no lo hay. `/es/student` -> `/en/student`.
 */
export function swapLocale(pathname: string, target: Locale): string {
  const segments = pathname.split("/").filter((s) => s !== "");
  if (segments.length > 0 && isLocale(segments[0]!)) segments.shift();
  return `/${[target, ...segments].join("/")}`;
}
