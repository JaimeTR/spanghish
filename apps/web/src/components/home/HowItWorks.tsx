import { useTranslations } from "next-intl";
import { Bubble, SectionQuestion } from "../Bubble";
import { container } from "../styles";

const ITEMS = ["practical", "grammar", "materials", "summary"] as const;

/** Campo morado. La respuesta es un hilo de bocadillos amarillos. */
export function HowItWorks() {
  const t = useTranslations("how");

  return (
    <section id="how" aria-labelledby="how-title" className="on-dark bg-brand-purple py-20 text-on-structure lg:py-28">
      <div className={`${container} grid gap-12 lg:grid-cols-12 lg:gap-10`}>
        <div className="lg:col-span-5">
          <SectionQuestion id="how-title" tone="white" tail="left">
            {t("question")}
          </SectionQuestion>
          <div className="mt-12 flex items-end gap-4">
            <span aria-hidden="true" className="lettering font-display text-[clamp(7rem,22vw,12rem)] leading-[0.8] text-brand-yellow">
              {t("minutes")}
            </span>
            <span className="pb-2 font-display text-[1.75rem] leading-[1.05] text-brand-yellow">
              <span className="sr-only">{t("minutes")} </span>
              {t("minutesLabel")}
            </span>
          </div>
          <p className="mt-5 max-w-[24rem] text-lg leading-relaxed">{t("minutesNote")}</p>
        </div>

        <ul className="flex flex-col gap-4 lg:col-span-7 lg:pt-2">
          {ITEMS.map((key, i) => (
            <li key={key} className={i % 2 ? "self-end sm:pl-16" : "self-start sm:pr-16"}>
              <Bubble tone={i % 2 ? "cream" : "yellow"} tail={i % 2 ? "right" : "left"} boxClassName="px-6 py-4 sm:px-7">
                <h3 className="font-display text-[1.6rem] leading-tight text-brand-burgundy">{t(`items.${key}.title`)}</h3>
                <p className="mt-1 text-[1.0625rem] leading-relaxed text-ink">{t(`items.${key}.body`)}</p>
              </Bubble>
            </li>
          ))}
          <li className="mt-6 rounded-lg border-2 border-on-structure/30 px-6 py-5">
            <h3 className="font-display text-[1.6rem] leading-tight text-brand-yellow">{t("placesTitle")}</h3>
            <p className="mt-1 text-[1.0625rem] leading-relaxed">{t("places")}</p>
          </li>
        </ul>
      </div>
    </section>
  );
}
