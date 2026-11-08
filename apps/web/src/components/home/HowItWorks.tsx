import { useTranslations } from "next-intl";
import { SectionQuestion } from "../Bubble";
import { BubbleThread, MinutesBadge, ThreadNote } from "../BubbleThread";
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
          <div className="mt-12">
            <MinutesBadge minutes={t("minutes")} label={t("minutesLabel")} />
          </div>
          <p className="mt-5 max-w-[24rem] text-lg leading-relaxed">{t("minutesNote")}</p>
        </div>

        <div className="lg:col-span-7 lg:pt-2">
          <BubbleThread
            items={ITEMS.map((key) => ({ key, title: t(`items.${key}.title`), body: t(`items.${key}.body`) }))}
            after={<ThreadNote title={t("placesTitle")}>{t("places")}</ThreadNote>}
          />
        </div>
      </div>
    </section>
  );
}
