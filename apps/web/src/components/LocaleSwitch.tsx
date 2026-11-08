"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { swapLocale } from "@/lib/locale-path";

/**
 * ES / EN conservando la ruta. Texto visible "ES"/"EN"; el nombre accesible
 * añade el idioma escrito en ese idioma.
 */
export function LocaleSwitch({ locale, tone = "light" }: { locale: Locale; tone?: "light" | "dark" }) {
  const t = useTranslations("nav");
  const tl = useTranslations("locales");
  const pathname = usePathname() ?? `/${locale}`;
  const dark = tone === "dark";

  return (
    <div
      role="group"
      aria-label={t("localeLabel")}
      className={`flex items-center rounded-full border-2 p-0.5 ${dark ? "border-on-structure/40" : "border-ink/15 bg-surface"}`}
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
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-2 text-sm font-bold no-underline transition-colors duration-150 ${
              current
                ? dark
                  ? "bg-brand-yellow text-ink"
                  : "bg-structure text-on-structure"
                : dark
                  ? "text-on-structure hover:bg-on-structure/15"
                  : "text-text-muted hover:bg-surface-sunken hover:text-text"
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
