import { useTranslations } from "next-intl";
import { TESTIMONIALS } from "@/lib/testimonials";
import { SectionQuestion } from "../Bubble";
import { container } from "../styles";
import { TestimonialSlider } from "./TestimonialSlider";

/**
 * Opiniones reales de alumnos, una a una, sobre el campo amarillo. El texto va
 * en inglés, como lo escribieron (`lang="en"` en cada cita).
 */
export function Testimonials() {
  const t = useTranslations("testimonials");

  return (
    <section id="testimonials" aria-labelledby="testimonials-title" className="bg-brand-yellow py-20 lg:py-28">
      <div className={`${container} grid items-start gap-x-14 gap-y-10 lg:grid-cols-12`}>
        <div className="flex flex-col items-start gap-4 lg:col-span-4 lg:pt-4">
          <SectionQuestion id="testimonials-title" tone="white">
            {t("question")}
          </SectionQuestion>
          <p className="max-w-[26rem] text-lg leading-relaxed text-ink">{t("intro")}</p>
        </div>
        <div className="lg:col-span-8">
          <TestimonialSlider
            label={t("label")}
            items={TESTIMONIALS.map((item) => ({ name: item.name, kind: t(`kinds.${item.kind}`), text: item.text }))}
          />
        </div>
      </div>
    </section>
  );
}
