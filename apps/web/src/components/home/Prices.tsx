import { useTranslations } from "next-intl";
import { Bubble, SectionQuestion } from "../Bubble";
import { PriceHighlights } from "../PriceHighlights";
import { btnPrimary, container } from "../styles";

/**
 * Solo los precios publicados en la web actual (lib/prices.ts). Sin calendario
 * de grupos (las fechas caducan): se invita a preguntar.
 */
export function Prices() {
  const t = useTranslations("prices");

  return (
    <section id="prices" aria-labelledby="prices-title" className="bg-cream py-20 lg:py-28">
      <div className={container}>
        <div className="flex flex-col items-start gap-4">
          <SectionQuestion id="prices-title" tone="fuchsia" tail="left">
            {t("question")}
          </SectionQuestion>
          <p className="text-lg text-ink-muted">{t("intro")}</p>
        </div>

        <PriceHighlights />

        <Bubble tone="yellow" tail="right" shadow className="mt-14 md:ml-auto md:max-w-[40rem]" boxClassName="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <h3 className="font-display text-[1.75rem] leading-tight text-brand-burgundy">{t("groupsAskTitle")}</h3>
            <p className="mt-1 leading-relaxed text-ink">{t("groupsAskBody")}</p>
          </div>
          {/* Misma página: la sección de contacto de la home está justo debajo. */}
          <a href="#contact" className={`${btnPrimary} shrink-0`}>
            {t("groupsAskCta")}
          </a>
        </Bubble>
      </div>
    </section>
  );
}
