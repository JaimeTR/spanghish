import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { bookingPath, HEADER_NAV, localePath, type HeaderNavKey, type RouteKey } from "@/lib/routes";
import { appLoginUrl } from "@/lib/site";
import { LockIcon } from "./icons";
import { LocaleSwitch } from "./LocaleSwitch";
import { MobileMenu } from "./MobileMenu";
import { MobileNavGroup, NavDisclosure, type NavSubItem, type NavTone } from "./NavDisclosure";
import { btnOnDark, btnOnDarkOutline, btnPrimary } from "./styles";

/** Color y edad de cada subpágina de "Clases" (el mismo que en la home). */
const SUB_STYLE: Partial<Record<RouteKey, { tone: NavTone; age?: "adults" | "kids" | "mature" }>> = {
  adults: { tone: "fuchsia", age: "adults" },
  kids: { tone: "yellow", age: "kids" },
  mature: { tone: "purple", age: "mature" },
  online: { tone: "burgundy" },
};

export function SiteHeader({
  locale,
  current,
  route,
}: {
  locale: Locale;
  current?: HeaderNavKey;
  /** Página actual, para marcar la subpágina activa del desplegable. */
  route?: RouteKey;
}) {
  const t = useTranslations("nav");
  const tc = useTranslations("common.audiences");
  const items = HEADER_NAV.map((item) => {
    const isCurrent = item.key === current;
    const children: NavSubItem[] | undefined =
      "children" in item
        ? item.children.map((c) => {
            const style = SUB_STYLE[c.route];
            return {
              key: c.key,
              href: localePath(locale, c.route),
              label: t(c.key),
              badge: style?.age ? tc(`${style.age}.age`) : undefined,
              tone: style?.tone ?? "neutral",
              current: c.route === route,
            };
          })
        : undefined;
    return {
      key: item.key,
      href: localePath(locale, item.route),
      current: isCurrent,
      /** En la página del enlace, "page"; en una de sus subpáginas, "true". */
      ariaCurrent: isCurrent ? (item.route === route || !children ? ("page" as const) : ("true" as const)) : undefined,
      children,
    };
  });

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink/10 bg-cream">
      <div className="relative mx-auto flex h-[4.5rem] w-full max-w-[76rem] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <Link href={localePath(locale, "home")} className="shrink-0 rounded-md">
          <Image src="/logo-spanglish.png" alt={t("home")} width={68} height={54} priority />
        </Link>

        <nav aria-label={t("label")} className="ml-2 hidden lg:block xl:ml-6">
          <ul className="flex items-center gap-0 xl:gap-1">
            {items.map((item) =>
              item.children ? (
                <NavDisclosure
                  key={item.key}
                  label={t(item.key)}
                  href={item.href}
                  toggleLabel={t("showLessons")}
                  current={item.ariaCurrent}
                  items={item.children}
                />
              ) : (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={item.ariaCurrent}
                    className="inline-flex min-h-11 items-center rounded-full px-2.5 font-semibold whitespace-nowrap text-ink no-underline decoration-brand-fuchsia decoration-[3px] transition-colors duration-200 hover:bg-ink/8 hover:underline aria-[current=page]:underline xl:px-3.5"
                  >
                    {t(item.key)}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LocaleSwitch locale={locale} />
          {/* Portal de alumnos (otra web, misma pestaña). Solo icono hasta 1180px
              para que la navegación quepa en una línea. */}
          <a
            href={appLoginUrl(locale)}
            className="hidden min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 font-semibold whitespace-nowrap text-ink no-underline decoration-brand-fuchsia decoration-[3px] transition-colors duration-200 hover:bg-ink/8 hover:underline lg:inline-flex min-[1180px]:px-3"
          >
            <LockIcon className="size-[1.125rem]" />
            <span className="sr-only min-[1180px]:not-sr-only">{t("login")}</span>
            <span className="sr-only"> {t("loginSuffix")}</span>
          </a>
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
                    {item.children ? (
                      <MobileNavGroup label={t(item.key)} current={item.current} items={item.children} />
                    ) : (
                      <Link
                        href={item.href}
                        aria-current={item.ariaCurrent}
                        className="flex min-h-14 items-center gap-3 rounded-md font-display text-2xl text-on-structure no-underline aria-[current=page]:text-brand-yellow"
                      >
                        {t(item.key)}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
            <Link href={bookingPath(locale)} className={`${btnOnDark} mt-4 w-full`}>
              {t("cta")}
            </Link>
            <a href={appLoginUrl(locale)} className={`${btnOnDarkOutline} mt-3 w-full`}>
              <LockIcon className="size-[1.125rem]" />
              {t("login")}
              <span className="sr-only"> {t("loginSuffix")}</span>
            </a>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
