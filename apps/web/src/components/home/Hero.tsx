import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { bookingPath, localePath } from "@/lib/routes";
import { Bubble } from "../Bubble";
import { ArrowIcon, SparkIcon } from "../icons";
import { btnInk, btnPrimary, container } from "../styles";
import { HeroSlider } from "./HeroSlider";

type SlideKey = "adults" | "kids" | "mature";
const KEYS: SlideKey[] = ["adults", "kids", "mature"];

/**
 * Primera vista: campo amarillo (el fondo del logo), titular rotulado como el
 * logo y una conversación Spanglish que se monta burbuja a burbuja. Tres
 * diapositivas (adultos, niños, mayores) sobre el mismo campo amarillo; solo
 * cambian el mensaje y la conversación.
 */
export function Hero() {
  const t = useTranslations("hero");
  const locale = useLocale() as Locale;

  const slideText = (key: SlideKey) =>
    key === "adults"
      ? {
          titleA: t("titleA"),
          titleB: t("titleB"),
          lead: t("lead"),
          secondary: t("secondary"),
          href: localePath(locale, "lessons"),
          chats: [t("chat1"), t("chat2"), t("chat3")],
        }
      : {
          titleA: t(`slides.${key}.titleA`),
          titleB: t(`slides.${key}.titleB`),
          lead: t(`slides.${key}.lead`),
          secondary: t(`slides.${key}.secondary`),
          href: localePath(locale, key === "kids" ? "kids" : "mature"),
          chats: [t(`slides.${key}.chat1`), t(`slides.${key}.chat2`), t(`slides.${key}.chat3`)],
        };

  const slides = KEYS.map((key, i) => {
    const s = slideText(key);
    const titleClass =
      "font-display leading-[0.92] text-[clamp(2.75rem,10.5vw,5rem)] lg:text-[min(5.25rem,5.4vw)]";
    const titleBody = (
      <>
        <span className="enter block text-brand-burgundy">{s.titleA}</span>{" "}
        <span className="lettering enter block text-brand-fuchsia [--e:1]">{s.titleB}</span>
      </>
    );
    return (
      <div key={key} className={`${container} grid items-center gap-x-10 gap-y-10 pt-10 pb-10 sm:pt-14 lg:grid-cols-12 lg:pt-20 lg:pb-12`}>
        <div className="lg:col-span-7">
          {/* Solo la primera diapositiva es el h1 de la página; las demás, títulos de nivel 2. */}
          {i === 0 ? (
            <h1 id="hero-title" className={titleClass}>
              {titleBody}
            </h1>
          ) : (
            <p role="heading" aria-level={2} className={titleClass}>
              {titleBody}
            </p>
          )}
          <p className="enter mt-6 max-w-[34rem] text-lg leading-relaxed text-ink [--e:2] sm:text-xl">{s.lead}</p>
          <div className="enter mt-8 flex flex-wrap items-center gap-3 [--e:3]">
            <Link href={bookingPath(locale)} className={btnPrimary}>
              {t("cta")}
              <ArrowIcon />
            </Link>
            <Link href={s.href} className={btnInk}>
              {s.secondary}
            </Link>
          </div>
          <p className="enter mt-5 flex items-start gap-2 font-semibold text-brand-burgundy [--e:4]">
            <SparkIcon />
            {t("free")}
          </p>
        </div>

        {/* Conversación ilustrativa (decorativa: el mensaje real está en el texto). */}
        <div aria-hidden="true" className="relative mx-auto w-full max-w-[26rem] lg:col-span-5 lg:max-w-none">
          <div className="flex flex-col gap-5">
            {/* Cada burbuja flota suavemente (envoltorio) sobre su entrada y su hover (burbuja). */}
            <div className="float mr-10 self-start">
              <Bubble
                tone="white"
                tail="left"
                shadow
                className="pop-in origin-bottom-left transition-transform duration-300 ease-out hover:-rotate-1 hover:scale-[1.03]"
                boxClassName="px-6 py-4 font-display text-[clamp(1.4rem,3.4vw,1.9rem)] leading-tight"
              >
                {s.chats[0]}
              </Bubble>
            </div>
            <div className="float ml-8 self-end [--f:1]">
              <Bubble
                tone="fuchsia"
                tail="right"
                shadow
                className="pop-in origin-bottom-right transition-transform duration-300 ease-out hover:rotate-1 hover:scale-[1.03] [--i:1]"
                boxClassName="px-6 py-5 font-display text-[clamp(1.6rem,4vw,2.4rem)] leading-[1.05]"
              >
                {s.chats[1]}
              </Bubble>
            </div>
            <div className="float self-start [--f:2]">
              <Bubble
                tone="purple"
                tail="left"
                shadow
                className="pop-in origin-bottom-left transition-transform duration-300 ease-out hover:-rotate-1 hover:scale-[1.03] [--i:2]"
                boxClassName="px-6 py-3 font-display text-[clamp(1.4rem,3.2vw,1.8rem)]"
              >
                {s.chats[2]}
              </Bubble>
            </div>
          </div>
        </div>
      </div>
    );
  });

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-brand-yellow">
      <HeroSlider
        slides={slides}
        labels={{
          region: t("slider.label"),
          goTo: KEYS.map((_, i) => t("slider.goTo", { n: i + 1, total: KEYS.length })),
        }}
      />
    </section>
  );
}
