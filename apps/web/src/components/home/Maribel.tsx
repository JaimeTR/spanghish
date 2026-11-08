import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { localePath } from "@/lib/routes";
import { Bubble, SectionQuestion } from "../Bubble";
import { ArrowIcon } from "../icons";
import { MaribelPhoto } from "../MaribelPhoto";
import { btnOnDarkOutline, container } from "../styles";

const FACTS = ["native", "certified", "based"] as const;

/**
 * Campo burdeos. Foto de Maribel en bocadillo con el tratamiento de marca y,
 * encima, su saludo rotulado como el logo.
 */
export function Maribel() {
  const t = useTranslations("maribel");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;

  return (
    <section id="maribel" aria-labelledby="maribel-title" className="on-dark bg-brand-burgundy py-20 text-on-primary lg:py-28">
      <div className={`${container} grid items-center gap-14 lg:grid-cols-12`}>
        <div className="lg:col-span-6">
          <SectionQuestion id="maribel-title" tone="yellow">
            {t("question")}
          </SectionQuestion>
          <p className="mt-10 max-w-[34rem] text-xl leading-relaxed sm:text-[1.375rem]">{t("body")}</p>
          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-on-primary/90">{t("body2")}</p>
          <Link href={localePath(locale, "teachers")} className={`${btnOnDarkOutline} mt-8`}>
            {tc("relatedTeachers")}
            <ArrowIcon />
          </Link>
        </div>

        {/* Ella habla: el bocadillo va encima y su cola apunta a su foto. */}
        <div className="mx-auto w-full max-w-[24rem] lg:col-span-6 lg:mr-0 lg:ml-auto">
          <Bubble
            tone="cream"
            tail="right"
            shadow
            className="relative z-10 -rotate-2 sm:mr-2"
            boxClassName="px-6 py-5 sm:px-7 sm:py-6"
          >
            <p aria-hidden="true" className="font-display text-[clamp(1.25rem,3.4vw,1.625rem)] leading-none text-brand-purple">
              {t("hello")}
            </p>
            <p className="lettering mt-1 font-display text-[clamp(1.875rem,6vw,2.75rem)] leading-[0.95] text-brand-fuchsia">
              {t("name")}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {FACTS.map((key) => (
                <li key={key} className="rounded-full bg-brand-yellow px-3.5 py-1.5 text-sm font-bold text-ink">
                  {t(`facts.${key}`)}
                </li>
              ))}
            </ul>
          </Bubble>
          <MaribelPhoto alt={t("photoAlt")} className="mx-auto mt-8 w-[min(72%,16rem)] sm:w-[17rem] lg:mr-4 lg:ml-auto" />
        </div>
      </div>
    </section>
  );
}
