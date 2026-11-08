import { useTranslations } from "next-intl";
import { Bubble, SectionQuestion } from "../Bubble";
import { container } from "../styles";

const FACTS = ["native", "certified", "years", "based"] as const;

/**
 * Campo burdeos. Sin foto todavía: Maribel se presenta con un bocadillo
 * grande, rotulado como el logo.
 */
export function Maribel() {
  const t = useTranslations("maribel");

  return (
    <section id="maribel" aria-labelledby="maribel-title" className="on-dark bg-brand-burgundy py-20 text-on-primary lg:py-28">
      <div className={`${container} grid items-center gap-14 lg:grid-cols-12`}>
        <div className="lg:col-span-6">
          <SectionQuestion id="maribel-title" tone="yellow">
            {t("question")}
          </SectionQuestion>
          <p className="mt-10 max-w-[34rem] text-xl leading-relaxed sm:text-[1.375rem]">{t("body")}</p>
          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-on-primary/90">{t("body2")}</p>
        </div>

        <div className="lg:col-span-6">
          <Bubble tone="cream" tail="right" shadow className="mx-auto max-w-[32rem] rotate-[-2deg]" boxClassName="px-8 pt-8 pb-9 sm:px-10">
            <p aria-hidden="true" className="font-display text-[clamp(2rem,5vw,2.75rem)] leading-none text-brand-purple">
              {t("hello")}
            </p>
            <p className="lettering mt-1 font-display text-[clamp(3rem,9vw,5rem)] leading-[0.95] text-brand-fuchsia">
              {t("name")}
            </p>
            <ul className="mt-7 flex flex-wrap gap-2">
              {FACTS.map((key) => (
                <li key={key} className="rounded-full bg-brand-yellow px-4 py-2 text-[0.9375rem] font-bold text-ink">
                  {t(`facts.${key}`)}
                </li>
              ))}
            </ul>
          </Bubble>
        </div>
      </div>
    </section>
  );
}
