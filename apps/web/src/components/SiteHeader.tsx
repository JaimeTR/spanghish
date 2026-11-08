import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { bookingPath, HEADER_NAV, localePath, type HeaderNavKey } from "@/lib/routes";
import { LocaleSwitch } from "./LocaleSwitch";
import { MobileMenu } from "./MobileMenu";
import { btnOnDark, btnPrimary } from "./styles";

export function SiteHeader({ locale, current }: { locale: Locale; current?: HeaderNavKey }) {
  const t = useTranslations("nav");
  const items = HEADER_NAV.map((item) => ({
    key: item.key,
    href: localePath(locale, item.route, "hash" in item ? item.hash : undefined),
    current: item.key === current,
  }));

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink/10 bg-cream">
      <div className="relative mx-auto flex h-[4.5rem] w-full max-w-[76rem] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Link href={localePath(locale, "home")} className="shrink-0 rounded-md">
          <Image src="/logo-spanglish.png" alt={t("home")} width={68} height={54} priority />
        </Link>

        <nav aria-label={t("label")} className="ml-4 hidden lg:block xl:ml-6">
          <ul className="flex items-center gap-0.5 xl:gap-1">
            {items.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                  className="inline-flex min-h-11 items-center rounded-full px-3 font-semibold whitespace-nowrap text-ink no-underline decoration-brand-fuchsia decoration-[3px] transition-colors duration-200 hover:bg-ink/8 hover:underline aria-[current=page]:underline xl:px-3.5"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LocaleSwitch locale={locale} />
          <span className="hidden sm:block">
            <Link href={bookingPath(locale)} className={`${btnPrimary} !min-h-11 !px-5 !text-base whitespace-nowrap`}>
              {t("cta")}
            </Link>
          </span>
          <MobileMenu label={t("menu")}>
            <nav aria-label={t("label")}>
              <ul className="flex flex-col">
                {items.map((item) => (
                  <li key={item.key} className="border-b border-on-structure/15 last:border-0">
                    <Link
                      href={item.href}
                      aria-current={item.current ? "page" : undefined}
                      className="flex min-h-14 items-center gap-3 rounded-md font-display text-2xl text-on-structure no-underline aria-[current=page]:text-brand-yellow"
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <Link href={bookingPath(locale)} className={`${btnOnDark} mt-4 w-full`}>
              {t("cta")}
            </Link>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
