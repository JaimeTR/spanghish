"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { swapLocale } from "@/lib/locale-path";
import { onLightFocus } from "./shell-styles";

/**
 * Cambia es/en conservando la ruta actual. Texto visible "ES"/"EN"; el nombre
 * accesible añade el idioma escrito en ese idioma ("EN English", lang="en").
 */
export function LocaleSwitch({ locale }: { locale: Locale }) {
  const t = useTranslations("shell");
  const tl = useTranslations("locales");
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label={t("localeLabel")}
      className="flex items-center rounded-md border border-line bg-surface p-0.5"
    >
      {routing.locales.map((l) => {
        const current = l === locale;
        return (
          <Link
            key={l}
            href={swapLocale(pathname, l)}
            lang={l}
            hrefLang={l}
            aria-current={current ? "true" : undefined}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-[6px] px-2 text-sm font-semibold transition-colors duration-150 ${onLightFocus} ${
              current ? "bg-structure text-on-structure" : "text-text-muted hover:bg-surface-sunken hover:text-text"
            }`}
          >
            {l.toUpperCase()}
            <span className="sr-only"> {tl(l)}</span>
          </Link>
        );
      })}
    </div>
  );
}
