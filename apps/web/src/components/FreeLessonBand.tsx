import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { bookingPath } from "@/lib/routes";
import { CONTACT } from "@/lib/site";
import { SectionQuestion } from "./Bubble";
import { ArrowIcon, PhoneIcon } from "./icons";
import { btnOnDark, btnOnDarkOutline, container } from "./styles";

/**
 * Cierre de las páginas interiores: campo fucsia con la acción principal
 * (la clase gratis) y el teléfono como atajo.
 */
export function FreeLessonBand() {
  const t = useTranslations("common.freeLesson");
  const locale = useLocale() as Locale;

  return (
    <section aria-labelledby="free-lesson-title" className="on-dark bg-brand-fuchsia py-20 text-on-primary lg:py-24">
      <div className={`${container} grid gap-10 lg:grid-cols-12 lg:items-center`}>
        <div className="lg:col-span-7">
          <SectionQuestion id="free-lesson-title" tone="yellow" tail="left">
            {t("question")}
          </SectionQuestion>
          <p className="mt-8 max-w-[34rem] text-xl leading-relaxed sm:text-[1.375rem]">{t("lead")}</p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:col-span-5 lg:items-end">
          <Link href={bookingPath(locale)} className={btnOnDark}>
            {t("cta")}
            <ArrowIcon />
          </Link>
          <a href={`tel:${CONTACT.phoneE164}`} className={btnOnDarkOutline}>
            <PhoneIcon />
            {t("call", { phone: CONTACT.phoneDisplay })}
          </a>
        </div>
      </div>
    </section>
  );
}
