import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { bookingPath } from "@/lib/routes";
import { SectionQuestion } from "../Bubble";
import { ContactBubbles } from "../ContactBubbles";
import { ArrowIcon } from "../icons";
import { btnOnDark, container } from "../styles";

/**
 * Cierre: campo fucsia, la acción principal. Teléfono y email reales, y el
 * formulario de solicitud de clase gratis (/bookings) para quien prefiera escribir.
 */
export function Contact() {
  const t = useTranslations("contact");
  const locale = useLocale() as Locale;

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
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[26rem] text-[1.0625rem] leading-relaxed">{t("note")}</p>
            <Link href={bookingPath(locale)} className={`${btnOnDark} shrink-0`}>
              {t("formCta")}
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
