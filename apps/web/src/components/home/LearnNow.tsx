import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { localePath } from "@/lib/routes";
import { SectionQuestion } from "../Bubble";
import { ArrowIcon } from "../icons";
import { btnInk, container } from "../styles";

const LEVELS = [
  { label: "A1", cls: "bg-brand-yellow text-ink" },
  { label: "A2", cls: "bg-brand-fuchsia text-on-primary" },
  { label: "B1", cls: "bg-brand-purple text-on-structure" },
  { label: "B2", cls: "bg-brand-burgundy text-on-primary" },
] as const;

/** Lecciones gratis: enlazan a Aprende ahora (/learn). */
export function LearnNow() {
  const t = useTranslations("learn");
  const locale = useLocale() as Locale;

  return (
    <section id="learn" aria-labelledby="learn-title" className="bg-surface-sunken py-20 lg:py-24">
      <div className={`${container} grid items-center gap-12 lg:grid-cols-12`}>
        <div className="lg:col-span-7">
          <SectionQuestion id="learn-title" tone="purple" tail="left">
            {t("question")}
          </SectionQuestion>
          <p className="mt-8 max-w-[38rem] text-lg leading-relaxed text-ink">{t("body")}</p>
          <div className="mt-8 flex flex-col items-start gap-3">
            <Link href={localePath(locale, "learn")} className={btnInk}>
              {t("cta")}
              <ArrowIcon />
            </Link>
            <p className="text-sm text-ink-muted">{t("note")}</p>
          </div>
        </div>
        <div className="lg:col-span-5">
          <p className="sr-only">{t("levelsLabel")}: A1, A2, B1, B2</p>
          <ol aria-hidden="true" className="flex items-end gap-3 text-[clamp(0.875rem,4.2vw,1.25rem)] sm:gap-4">
            {LEVELS.map((l, i) => (
              <li
                key={l.label}
                className={`flex items-center justify-center rounded-[1.5rem] font-display leading-none ${l.cls}`}
                style={{ width: `${3.4 + i * 0.7}em`, height: `${3.4 + i * 0.7}em` }}
              >
                <span style={{ fontSize: `${(3.4 + i * 0.7) * 0.4}em` }}>{l.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
