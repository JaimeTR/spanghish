import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Bubble } from "@/components/Bubble";
import { ArrowIcon } from "@/components/icons";
import { PageShell } from "@/components/PageShell";
import { btnInk, btnPrimary, container } from "@/components/styles";
import type { Locale } from "@/i18n/routing";
import { bookingPath, localePath } from "@/lib/routes";

/**
 * 404 de marca: el titular es un bocadillo (la conversación "se pierde") y
 * ofrece tres salidas: inicio, clases y clase gratis. Next añade noindex.
 */
export default function NotFound() {
  const t = useTranslations("notFound");
  const locale = useLocale() as Locale;

  return (
    <PageShell locale={locale} route="home">
      <title>{t("metaTitle")}</title>
      <section aria-labelledby="page-title" className="bg-brand-yellow">
        <div className={`${container} grid items-center gap-x-10 gap-y-10 py-16 lg:grid-cols-12 lg:py-24`}>
          <div className="lg:col-span-7">
            <Bubble tone="white" tail="left" shadow className="pop inline-block max-w-full origin-bottom-left" boxClassName="px-6 py-5 sm:px-9 sm:py-7">
              <h1 id="page-title" className="font-display text-[clamp(2.25rem,7vw,4rem)] leading-[1.02] text-brand-burgundy">
                {t("title")}
              </h1>
            </Bubble>
            <p className="mt-8 max-w-[34rem] text-lg leading-relaxed text-ink sm:text-xl">{t("lead")}</p>
            <ul className="mt-8 flex flex-wrap items-center gap-3">
              <li>
                <Link href={bookingPath(locale)} className={btnPrimary}>
                  {t("booking")}
                  <ArrowIcon />
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "lessons")} className={btnInk}>
                  {t("lessons")}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, "home")} className={btnInk}>
                  {t("home")}
                </Link>
              </li>
            </ul>
          </div>
          <p
            aria-hidden="true"
            className="lettering font-display leading-[0.8] text-brand-fuchsia text-[clamp(7rem,28vw,15rem)] lg:col-span-5 lg:text-right"
          >
            {t("code")}
          </p>
        </div>
      </section>
    </PageShell>
  );
}
