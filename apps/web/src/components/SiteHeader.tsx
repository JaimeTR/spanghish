import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { BOOKING_HREF, NAV_ITEMS } from "@/lib/site";
import { LocaleSwitch } from "./LocaleSwitch";
import { MobileMenu } from "./MobileMenu";
import { btnOnDark, btnPrimary } from "./styles";

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink/10 bg-cream">
      <div className="relative mx-auto flex h-[4.5rem] w-full max-w-[76rem] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Link href={`/${locale}`} className="shrink-0 rounded-md">
          <Image src="/logo-spanglish.png" alt={t("home")} width={68} height={54} priority />
        </Link>

        <nav aria-label={t("label")} className="ml-6 hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-full px-3.5 font-semibold text-ink no-underline decoration-brand-fuchsia decoration-[3px] hover:underline"
                >
                  {t(item.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LocaleSwitch locale={locale} />
          <span className="hidden sm:block">
            <a href={BOOKING_HREF} className={`${btnPrimary} !min-h-11 !px-5 !text-base`}>
              {t("cta")}
            </a>
          </span>
          <MobileMenu label={t("menu")}>
            <nav aria-label={t("label")}>
              <ul className="flex flex-col">
                {NAV_ITEMS.map((item) => (
                  <li key={item.key} className="border-b border-on-structure/15 last:border-0">
                    <a
                      href={item.href}
                      className="flex min-h-14 items-center rounded-md font-display text-2xl text-on-structure no-underline"
                    >
                      {t(item.key)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <a href={BOOKING_HREF} className={`${btnOnDark} mt-4 w-full`}>
              {t("cta")}
            </a>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
