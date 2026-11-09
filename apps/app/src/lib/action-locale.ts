import { isLocale, routing, type Locale } from "../i18n/routing";

/**
 * Idioma de la interfaz desde el campo oculto `uiLocale` de un formulario
 * (las Server Actions no reciben params de ruta). Por defecto, `es`.
 */
export function actionLocale(formData: FormData): Locale {
  const value = formData.get("uiLocale");
  return typeof value === "string" && isLocale(value) ? value : routing.defaultLocale;
}
