import { getRequestConfig } from "next-intl/server";
import { isLocale, routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : routing.defaultLocale;
  return {
    locale,
    // Zona horaria del negocio según la especificación.
    timeZone: "Australia/Brisbane",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
