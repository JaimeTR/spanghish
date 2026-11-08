import { useTranslations } from "next-intl";
import { CONTACT } from "@/lib/site";
import { Bubble, SectionQuestion } from "../Bubble";
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
          <Bubble tone="cream" tail="left" shadow className="lg:mr-14">
            <a
              href={`tel:${CONTACT.phoneE164}`}
              className="group flex flex-col gap-1 rounded-[1.75rem] px-6 py-6 text-ink no-underline [--focus-color:var(--brand-purple)] sm:px-8"
            >
              <span className="font-semibold text-ink-muted">{t("phoneLabel")}</span>
              <span className="font-display text-[clamp(2.1rem,7vw,3.5rem)] leading-none text-brand-purple decoration-[3px] group-hover:underline">
                {CONTACT.phoneDisplay}
              </span>
            </a>
          </Bubble>
          <Bubble tone="yellow" tail="right" shadow className="lg:ml-14">
            <a
              href={`mailto:${CONTACT.email}`}
              className="group flex flex-col gap-1 rounded-[1.75rem] px-6 py-6 text-ink no-underline [--focus-color:var(--brand-purple)] sm:px-8"
            >
              <span className="font-semibold text-ink/75">{t("emailLabel")}</span>
              <span className="font-display text-[clamp(1.45rem,5.6vw,2.6rem)] leading-none [overflow-wrap:anywhere] text-brand-burgundy decoration-[3px] group-hover:underline">
                {CONTACT.email}
              </span>
            </a>
          </Bubble>
          <p className="flex items-start gap-2 text-[1.0625rem] leading-relaxed">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-1 size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="10" cy="10" r="8" />
              <path d="M10 5.5V10l3 2" />
            </svg>
            {t("note")}
          </p>
        </div>
      </div>
    </section>
  );
}
