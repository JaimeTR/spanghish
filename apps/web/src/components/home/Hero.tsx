import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { bookingPath, localePath } from "@/lib/routes";
import { Bubble } from "../Bubble";
import { ArrowIcon, SparkIcon } from "../icons";
import { btnInk, btnPrimary, container } from "../styles";

/**
 * Primera vista: campo amarillo (el fondo del logo), titular rotulado como el
 * logo y una conversación Spanglish que se monta burbuja a burbuja.
 */
export function Hero() {
  const t = useTranslations("hero");
  const locale = useLocale() as Locale;

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-brand-yellow">
      <div className={`${container} grid items-center gap-x-10 gap-y-10 pt-10 pb-16 sm:pt-14 lg:grid-cols-12 lg:pt-20 lg:pb-24`}>
        <div className="lg:col-span-7">
          <h1 id="hero-title" className="font-display leading-[0.92] text-[clamp(3rem,10.5vw,5rem)] lg:text-[min(5.25rem,5.4vw)]">
            <span className="block text-brand-burgundy">{t("titleA")}</span>{" "}
            <span className="lettering block text-brand-fuchsia">{t("titleB")}</span>
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink sm:text-xl">{t("lead")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={bookingPath(locale)} className={btnPrimary}>
              {t("cta")}
              <ArrowIcon />
            </Link>
            <Link href={localePath(locale, "lessons")} className={btnInk}>
              {t("secondary")}
            </Link>
          </div>
          <p className="mt-5 flex items-start gap-2 font-semibold text-brand-burgundy">
            <SparkIcon />
            {t("free")}
          </p>
        </div>

        {/* Conversación ilustrativa (decorativa: el mensaje real está en el texto). */}
        <div aria-hidden="true" className="relative mx-auto w-full max-w-[26rem] lg:col-span-5 lg:max-w-none">
          <div className="flex flex-col gap-5">
            <Bubble
              tone="white"
              tail="left"
              shadow
              className="pop mr-10 origin-bottom-left self-start"
              boxClassName="px-6 py-4 font-display text-[clamp(1.4rem,3.4vw,1.9rem)] leading-tight"
            >
              {t("chat1")}
            </Bubble>
            <Bubble
              tone="fuchsia"
              tail="right"
              shadow
              className="pop ml-8 origin-bottom-right self-end [--i:1]"
              boxClassName="px-6 py-5 font-display text-[clamp(1.6rem,4vw,2.4rem)] leading-[1.05]"
            >
              {t("chat2")}
            </Bubble>
            <Bubble
              tone="purple"
              tail="left"
              shadow
              className="pop origin-bottom-left self-start [--i:2]"
              boxClassName="px-6 py-3 font-display text-[clamp(1.4rem,3.2vw,1.8rem)]"
            >
              {t("chat3")}
            </Bubble>
          </div>
        </div>
      </div>
    </section>
  );
}
