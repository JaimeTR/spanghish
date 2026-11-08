import { useTranslations } from "next-intl";
import { SectionQuestion } from "../Bubble";
import { ContactBubbles } from "../ContactBubbles";
import { ClockIcon } from "../icons";
import { container } from "../styles";

/**
 * Cierre: campo fucsia, la acción principal. Sin formulario falso: teléfono y
 * email reales hasta que llegue la reserva online con la nueva plataforma.
 */
export function Contact() {
  const t = useTranslations("contact");

  return (
    <section id="contact" aria-labelledby="contact-title" className="on-dark bg-brand-fuchsia py-20 text-on-primary lg:py-28">
      <div className={`${container} grid gap-12 lg:grid-cols-12 lg:items-center`}>
        <div className="lg:col-span-5">
          <SectionQuestion id="contact-title" tone="yellow" tail="left">
            {t("question")}
          </SectionQuestion>
          <p className="mt-8 max-w-[30rem] text-xl leading-relaxed sm:text-[1.375rem]">{t("lead")}</p>
          <p className="mt-6 font-semibold">{t("hours")}</p>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-7">
          <ContactBubbles phoneLabel={t("phoneLabel")} emailLabel={t("emailLabel")} />
          <p className="flex items-start gap-2 text-[1.0625rem] leading-relaxed">
            <ClockIcon />
            {t("note")}
          </p>
        </div>
      </div>
    </section>
  );
}
