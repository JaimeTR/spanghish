import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { localePath } from "@/lib/routes";
import { AudienceTile } from "../AudienceTile";
import { SectionQuestion } from "../Bubble";
import { ArrowIcon } from "../icons";
import { People, PEOPLE_BY_FORMAT } from "../People";
import { container } from "../styles";

/**
 * Para quién: bloques de color de tamaños distintos (no una fila de tarjetas
 * iguales). La edad, en rotulado grande, es el dato que el visitante busca.
 */
export function Lessons() {
  const t = useTranslations("lessons");
  const locale = useLocale() as Locale;

  return (
    <section id="lessons" aria-labelledby="lessons-title" className="bg-cream py-20 lg:py-28">
      <div className={container}>
        <div className="flex flex-col items-start gap-4">
          <SectionQuestion id="lessons-title" tone="yellow">
            {t("question")}
          </SectionQuestion>
          <p className="max-w-[40rem] text-lg leading-relaxed text-ink-muted">{t("intro")}</p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          <AudienceTile
            href={localePath(locale, "adults")}
            className="on-dark bg-brand-fuchsia text-on-primary sm:col-span-2 lg:col-span-4 lg:row-span-2"
            age={t("adults.age")}
            title={t("adults.title")}
            body={t("adults.body")}
            image={{ src: "/img/lessons-adults.png", sizes: "(min-width: 1024px) 44rem, 100vw", position: "50% 30%" }}
            big
          />
          <AudienceTile
            href={localePath(locale, "kids")}
            className="bg-brand-yellow text-ink lg:col-span-2"
            age={t("kids.age")}
            title={t("kids.title")}
            body={t("kids.body")}
            image={{ src: "/img/lessons-kids.jpg", sizes: "(min-width: 1024px) 22rem, (min-width: 640px) 50vw, 100vw", position: "50% 35%" }}
          />
          <AudienceTile
            href={localePath(locale, "mature")}
            className="on-dark bg-brand-purple text-on-structure lg:col-span-2"
            age={t("mature.age")}
            title={t("mature.title")}
            body={t("mature.body")}
            image={{ src: "/img/lessons-mature.jpg", sizes: "(min-width: 1024px) 22rem, (min-width: 640px) 50vw, 100vw", position: "40% 40%" }}
          />
          {/* Bloque entero clicable (enlace estirado desde el h3), como AudienceTile. */}
          <li className="group on-dark relative flex flex-col justify-between gap-6 overflow-hidden rounded-lg bg-brand-burgundy p-6 text-on-primary transition-transform duration-200 ease-out hover:-translate-y-1 has-[a:focus-visible]:outline-[3px] has-[a:focus-visible]:outline-offset-[3px] has-[a:focus-visible]:outline-[var(--brand-purple)] has-[a:focus-visible]:outline-solid motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:col-span-2 sm:p-8 lg:col-span-6 lg:flex-row lg:items-center">
            <div className="max-w-[36rem]">
              <span className="inline-block rounded-full bg-brand-yellow px-3 py-1 text-sm font-bold text-ink">
                {t("online.tag")}
              </span>
              <h3 className="mt-3 font-display text-[clamp(1.9rem,4vw,2.75rem)] leading-none">
                <Link
                  href={localePath(locale, "online")}
                  className="text-current no-underline outline-none after:absolute after:inset-0 after:content-['']"
                >
                  {t("online.title")}
                </Link>
              </h3>
              <p className="mt-3 text-lg leading-relaxed">{t("online.body")}</p>
              <span aria-hidden="true" className="mt-5 inline-flex items-center gap-2 font-bold underline decoration-2 underline-offset-4 group-hover:decoration-[3px]">
                {t("online.more")}
                <ArrowIcon />
              </span>
            </div>
            <ScreenChat />
          </li>
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border-2 border-dashed border-ink/25 px-5 py-4 sm:px-6">
          <h3 className="font-bold text-ink">{t("soonLabel")}</h3>
          <ul className="flex flex-wrap gap-2">
            {(["soonDele", "soonAfter"] as const).map((key) => (
              <li key={key} className="rounded-full bg-surface px-3.5 py-1.5 text-[0.9375rem] font-semibold text-ink-muted">
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <h3 className="mt-20 font-display text-[clamp(1.75rem,3.4vw,2.5rem)] leading-none text-brand-purple">
          {t("formatsTitle")}
        </h3>
        <ul className="mt-8 grid gap-x-8 gap-y-10 md:grid-cols-3">
          {(["private", "own", "local"] as const).map((key) => (
            <li key={key} className="border-t-2 border-ink pt-5">
              <People count={PEOPLE_BY_FORMAT[key]} />
              <h4 className="mt-4 text-xl font-extrabold text-ink">{t(`formats.${key}.title`)}</h4>
              <p className="mt-1.5 leading-relaxed text-ink-muted">{t(`formats.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Mini pantalla con dos bocadillos: la conversación, online. */
function ScreenChat() {
  return (
    <svg aria-hidden="true" viewBox="0 0 220 140" className="w-full max-w-[15rem] shrink-0 self-end lg:self-center">
      <rect x="6" y="6" width="208" height="120" rx="16" fill="#FBF7EC" />
      <rect x="6" y="6" width="208" height="22" rx="11" fill="#592F85" />
      <circle cx="22" cy="17" r="4" fill="#FCD404" />
      <circle cx="36" cy="17" r="4" fill="#FBF7EC" opacity=".6" />
      <rect x="22" y="42" width="110" height="28" rx="14" fill="#D71950" />
      <path d="M30 68l-6 12 16-10z" fill="#D71950" />
      <rect x="90" y="82" width="108" height="28" rx="14" fill="#FCD404" />
      <path d="M190 108l6 12-16-10z" fill="#FCD404" />
      <rect x="34" y="52" width="62" height="8" rx="4" fill="#FFFFFF" />
      <rect x="104" y="92" width="72" height="8" rx="4" fill="#1E1226" opacity=".7" />
      <rect x="92" y="126" width="36" height="8" rx="2" fill="#FBF7EC" />
    </svg>
  );
}
