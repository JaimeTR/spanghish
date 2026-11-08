import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { ACCESS_LEVELS, cardsFor, type AccessLevel, type ResourceCard } from "@/lib/resources";
import { bookingPath, localePath } from "@/lib/routes";
import { appLoginUrl, LEARN_URL } from "@/lib/site";
import { VIDEOS } from "@/lib/videos";
import { Bubble, SectionQuestion, type BubbleTone } from "../Bubble";
import { FreeLessonBand } from "../FreeLessonBand";
import { Videos } from "../home/Videos";
import { ArrowIcon, ExternalIcon, LockIcon, ResourceIcon } from "../icons";
import { HeroChat, heroButtons, PageHero } from "../PageHero";
import { btnInk, btnPrimary, container } from "../styles";

/** Color de cada nivel de acceso: libre amarillo, con cuenta morado, alumnos burdeos. */
const TIER: Record<AccessLevel, { bubble: BubbleTone; tile: string }> = {
  public: { bubble: "yellow", tile: "bg-brand-yellow text-ink" },
  account: { bubble: "purple", tile: "bg-brand-purple text-on-structure" },
  enrolled: { bubble: "burgundy", tile: "bg-brand-burgundy text-on-primary" },
};

/**
 * Recursos: lo que se puede usar hoy (videos y lecciones de la web actual) y
 * cómo se organizarán por nivel de acceso. No hay formularios de login ni de
 * alta: los recursos de alumnos enlazan al login del portal (apps/app).
 */
export function ResourcesPage({ locale }: { locale: Locale }) {
  const t = useTranslations("page.resources");
  const tn = useTranslations("nav");
  const tl = useTranslations("learn");
  const ta = useTranslations("a11y");
  const buttons = heroButtons("yellow");

  return (
    <>
      <PageHero
        tone="yellow"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: tn("resources"), href: localePath(locale, "resources") },
        ]}
        titleA={t("titleA")}
        titleB={t("titleB")}
        lead={<p>{t("lead")}</p>}
        actions={
          <>
            <a href="#videos" className={buttons.primary}>
              {t("toVideos")}
              <ArrowIcon />
            </a>
            <a href="#access" className={buttons.secondary}>
              {t("toAccess")}
            </a>
          </>
        }
        aside={<HeroChat ask={t("ask")} answer={t("answer")} answerTone="fuchsia" />}
      />

      <Videos />

      {/* Lecciones interactivas: hoy, en la web actual */}
      <section aria-labelledby="learn-title" className="bg-surface-sunken py-20 lg:py-24">
        <div className={`${container} grid items-center gap-10 lg:grid-cols-12`}>
          <div className="lg:col-span-7">
            <SectionQuestion id="learn-title" tone="purple" tail="left">
              {t("learn.question")}
            </SectionQuestion>
            <p className="mt-8 max-w-[38rem] text-lg leading-relaxed text-ink">{t("learn.body")}</p>
            <p className="mt-4 max-w-[38rem] text-lg leading-relaxed text-ink-muted">{t("learn.moving")}</p>
          </div>
          <div className="flex lg:col-span-5 lg:justify-end">
            <a href={LEARN_URL} rel="noopener noreferrer" className={btnInk}>
              {tl("cta")}
              <ExternalIcon />
              <span className="sr-only">{ta("external")}</span>
            </a>
          </div>
        </div>
      </section>

      {/* Niveles de acceso */}
      <section id="access" aria-labelledby="access-title" className="bg-cream py-20 lg:py-28">
        <div className={container}>
          <div className="flex flex-col items-start gap-4">
            <SectionQuestion id="access-title" tone="fuchsia">
              {t("access.question")}
            </SectionQuestion>
            <p className="max-w-[40rem] text-lg leading-relaxed text-ink-muted">{t("access.intro")}</p>
          </div>

          <div className="mt-12 grid gap-x-6 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            {ACCESS_LEVELS.map((level, i) => (
              <div key={level} className={level === "enrolled" ? "md:col-span-2 lg:col-span-1" : undefined}>
                <Bubble
                  tone={TIER[level].bubble}
                  tail={i % 2 ? "right" : "left"}
                  shadow
                  className="max-w-full"
                  boxClassName="px-6 py-4"
                >
                  <h3 className="font-display text-[2rem] leading-none">{t(`access.tiers.${level}.title`)}</h3>
                  <p className="mt-1.5 flex items-center gap-1.5 font-semibold">
                    {level !== "public" && <LockIcon />}
                    {t(`access.tiers.${level}.status`)}
                  </p>
                </Bubble>
                <ul className="mt-6 flex flex-col gap-3">
                  {cardsFor(level).map((card) => (
                    <ResourceTile key={card.key} card={card} locale={locale} />
                  ))}
                </ul>
                {level === "account" && <p className="mt-4 leading-relaxed text-ink-muted">{t("access.accountNote")}</p>}
                {level === "enrolled" && (
                  <div className="mt-5 rounded-lg border-2 border-dashed border-ink/25 px-5 py-4">
                    <p className="leading-relaxed text-ink">{t("access.studentsNote")}</p>
                    <Link href={bookingPath(locale)} className={`${btnPrimary} mt-4 !min-h-11 !px-5 !text-base`}>
                      {t("access.studentsCta")}
                      <ArrowIcon />
                    </Link>
                    <p className="mt-4 text-sm leading-relaxed text-ink-muted">{t("access.discount")}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <FreeLessonBand />
    </>
  );
}

/**
 * Tarjeta de un recurso. "open": enlace al recurso; "locked": enlace al login
 * del portal ("Entra para verlo"); "soon": informativa, sin enlace.
 * Toda la tarjeta es clicable (enlace estirado desde el título).
 */
function ResourceTile({ card, locale }: { card: ResourceCard; locale: Locale }) {
  const t = useTranslations("page.resources.access");
  const ta = useTranslations("a11y");
  const video = card.videoId ? VIDEOS.find((v) => v.id === card.videoId) : undefined;
  const title = video ? video.title : t(`items.${card.key}.title`);
  const meta = t(`items.${video ? "video" : card.key}.meta`);
  const soon = card.state === "soon";
  const locked = card.state === "locked";
  const href =
    card.state === "locked"
      ? appLoginUrl(locale)
      : card.target === "learn"
        ? LEARN_URL
        : card.videoId
          ? `#video-${card.videoId}`
          : undefined;
  const tone = TIER[card.access].tile;

  const focus =
    "has-[a:focus-visible]:outline-[3px] has-[a:focus-visible]:outline-offset-[3px] has-[a:focus-visible]:outline-[var(--brand-purple)] has-[a:focus-visible]:outline-solid";

  return (
    <li
      className={`group relative flex items-center gap-4 rounded-[1.5rem] p-3 pr-4 transition-transform duration-200 ease-out ${
        soon
          ? "border-2 border-dashed border-ink/25"
          : `bg-surface ring-1 ring-ink/10 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${focus}`
      }`}
    >
      <span aria-hidden="true" className="relative shrink-0">
        {video ? (
          <span className="relative block h-14 w-24 overflow-hidden rounded-2xl bg-ink">
            <Image src={`/img/videos/${video.id}.jpg`} alt="" fill sizes="6rem" className="object-cover" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-fuchsia text-brand-yellow">
                <svg viewBox="0 0 24 24" className="ml-0.5 size-3.5" fill="currentColor">
                  <path d="M7 4.5v15l13-7.5z" />
                </svg>
              </span>
            </span>
          </span>
        ) : (
          <span className={`flex size-14 items-center justify-center rounded-2xl ${soon ? "bg-ink/8 text-ink-muted" : tone}`}>
            <ResourceIcon kind={card.kind} />
          </span>
        )}
        {(locked || card.access !== "public") && (
          <span className="absolute -top-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full bg-ink text-cream ring-2 ring-cream">
            <LockIcon className="size-3.5" />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <h4 className={`leading-snug font-extrabold ${soon ? "text-ink-muted" : "text-ink"}`} lang={video ? "en" : undefined}>
          {href ? (
            <a
              href={href}
              rel={card.target === "learn" ? "noopener noreferrer" : undefined}
              className="text-current no-underline outline-none after:absolute after:inset-0 after:rounded-[1.5rem] after:content-['']"
            >
              {title}
              {locked && <span className="sr-only">: {t("locked")}</span>}
              {card.target === "learn" && <span className="sr-only"> {ta("external")}</span>}
            </a>
          ) : (
            title
          )}
        </h4>
        <span className="mt-0.5 block text-[0.9375rem] leading-snug text-ink-muted">{meta}</span>
        {soon && (
          <span className="mt-2 inline-block rounded-full bg-ink/8 px-2.5 py-0.5 text-sm font-bold text-ink">{t("soon")}</span>
        )}
        {locked && (
          <span aria-hidden="true" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-brand-burgundy group-hover:underline">
            {t("locked")}
            <ArrowIcon className="size-4" />
          </span>
        )}
      </span>

      {card.state === "open" && (
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full ring-2 ring-ink/20 transition-colors duration-200 group-hover:bg-ink/8">
          {card.target === "learn" ? <ExternalIcon /> : <ArrowIcon />}
        </span>
      )}
    </li>
  );
}
