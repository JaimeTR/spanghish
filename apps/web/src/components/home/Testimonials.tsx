import { useTranslations } from "next-intl";
import { TESTIMONIALS } from "@/lib/testimonials";
import { SectionQuestion } from "../Bubble";
import { container } from "../styles";
import { TestimonialSlider } from "./TestimonialSlider";

/**
 * Opiniones reales de alumnos que van pasando solas (2 a la vez en pantallas
 * grandes, 1 en móvil), sobre el campo amarillo. El texto va en inglés, como lo
 * escribieron (`lang="en"` en cada cita).
 */
export function Testimonials() {
  const t = useTranslations("testimonials");

  return (
    <section id="testimonials" aria-labelledby="testimonials-title" className="bg-brand-yellow py-20 lg:py-28">
      <div className={container}>
        <div className="flex flex-col items-start gap-4">
          <SectionQuestion id="testimonials-title" tone="white">
            {t("question")}
          </SectionQuestion>
          <p className="max-w-[40rem] text-lg leading-relaxed text-ink">{t("intro")}</p>
        </div>
        <div className="mt-12">
          <TestimonialSlider
            label={t("label")}
            items={TESTIMONIALS.map((item) => ({ name: item.name, kind: t(`kinds.${item.kind}`), text: item.text }))}
          />
        </div>
      </div>
    </section>
  );
}
