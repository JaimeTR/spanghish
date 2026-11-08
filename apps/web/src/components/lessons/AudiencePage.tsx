import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { AUDIENCES, relatedAudiences, type Audience, type FormatGroup } from "@/lib/lessons";
import { bookingPath, localePath } from "@/lib/routes";
import { CONTACT } from "@/lib/site";
import { AUDIENCE_STYLE } from "../audience-style";
import { AudienceTile } from "../AudienceTile";
import { SectionQuestion } from "../Bubble";
import { BubbleThread, MinutesBadge, ThreadNote } from "../BubbleThread";
import { Faq } from "../Faq";
import { FreeLessonBand } from "../FreeLessonBand";
import { ArrowIcon, CheckIcon, SparkIcon } from "../icons";
import { HeroChat, heroButtons, PageHero } from "../PageHero";
import { People, PEOPLE_BY_FORMAT } from "../People";
import { PriceItem } from "../PriceItem";
import { btnInk, container } from "../styles";

/**
 * Página de clases para un público. Recorrido: quién → cómo es una clase →
 * formatos → precios → dudas → otras páginas → clase gratis.
 */
export function AudiencePage({ locale, audience }: { locale: Locale; audience: Audience }) {
  const t = useTranslations(`page.${audience}`);
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const th = useTranslations("hero");
  const tm = useTranslations("maribel");
  const data = AUDIENCES[audience];
  const style = AUDIENCE_STYLE[audience];
  const buttons = heroButtons(style.hero);
  const tags = Object.keys(t.raw("who.tags") as Record<string, string>);

  return (
    <>
      <PageHero
        tone={style.hero}
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: tn("lessons"), href: localePath(locale, "lessons") },
          { label: tc(`audiences.${audience}.name`), href: localePath(locale, data.route) },
        ]}
        titleA={t("titleA")}
        titleB={t("titleB")}
        lead={
          <>
            <p>{t("lead")}</p>
            <p className="mt-4 flex items-start gap-2 text-base font-semibold sm:text-lg">
              <SparkIcon />
              {th("free")}
            </p>
          </>
        }
        actions={
          <>
            <Link href={bookingPath(locale)} className={buttons.primary}>
              {tc("freeLesson.cta")}
              <ArrowIcon />
            </Link>
            <a href="#prices" className={buttons.secondary}>
              {tc("seePrices")}
            </a>
          </>
        }
        aside={
          <HeroChat
            ask={t("ask")}
            answer={t("answer")}
            answerTone={style.answer}
            badge={tc(`audiences.${audience}.age`)}
            badgeClassName={style.badge}
          />
        }
      />

      {/* Para quién */}
      <section aria-labelledby="who-title" className="bg-cream py-20 lg:py-28">
        <div className={container}>
          <SectionQuestion id="who-title" tone="yellow">
            {t("who.question")}
          </SectionQuestion>
          <p className="mt-8 max-w-[44rem] text-xl leading-relaxed text-ink sm:text-2xl sm:leading-relaxed">{t("who.body")}</p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {tags.map((key) => (
              <li key={key} className={`rounded-full px-4 py-2 font-bold ${style.tile}`}>
                {t(`who.tags.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Cómo es una clase */}
      <section aria-labelledby="how-title" className="on-dark bg-brand-purple py-20 text-on-structure lg:py-28">
        <div className={`${container} grid gap-12 lg:grid-cols-12 lg:gap-10`}>
          <div className="lg:col-span-5">
            <SectionQuestion id="how-title" tone="white">
              {tc("howQuestion")}
            </SectionQuestion>
            <div className="mt-12">
              <MinutesBadge minutes={tc("minutes")} label={tc("minutesLabel")} />
            </div>
            <p className="mt-5 max-w-[26rem] text-lg leading-relaxed">{t("how.intro")}</p>
          </div>
          <div className="lg:col-span-7 lg:pt-2">
            <BubbleThread
              items={data.activities.map((key) => ({ key, title: t(`how.${key}.title`), body: t(`how.${key}.body`) }))}
              after={
                <ThreadNote title={tc("includesTitle")}>
                  <ul className="flex flex-col gap-1">
                    {(["materials", "summary", "homework"] as const).map((key) => (
                      <li key={key} className="flex items-start gap-2">
                        <CheckIcon />
                        {tc(`includes.${key}`)}
                      </li>
                    ))}
                  </ul>
                </ThreadNote>
              }
            />
          </div>
        </div>
      </section>

      <Formats groups={data.formatGroups} />

      {/* Precios */}
      <section id="prices" aria-labelledby="prices-title" className="bg-surface-sunken py-20 lg:py-28">
        <div className={container}>
          <div className="flex flex-col items-start gap-4">
            <SectionQuestion id="prices-title" tone="fuchsia">
              {tc("pricesQuestion")}
            </SectionQuestion>
            <p className="text-lg text-ink-muted">
              {tc("pricesNote")}
              {audience === "mature" && <> {t("ratesFrom")}</>}
            </p>
          </div>
          <ul className="mt-12 grid border-t-2 border-ink md:grid-cols-3">
            {data.prices.map((key) => {
              const p = (k: string) => tc(`prices.${key}.${k}`);
              const has = (k: string) => tc.has(`prices.${key}.${k}`);
              return (
                <PriceItem
                  key={key}
                  highlight={key === "free"}
                  small={key === "privateAsk"}
                  amount={p("amount")}
                  title={p("title")}
                  body={p("body")}
                  pre={has("from") ? p("from") : undefined}
                  unit={has("unit") ? p("unit") : undefined}
                >
                  {key === "privateAsk" && (
                    <a href={`mailto:${CONTACT.email}`} className={`${btnInk} !min-h-11 !px-5 !text-base`}>
                      {tc("sendEmail")}
                      <span className="sr-only">: {CONTACT.email}</span>
                    </a>
                  )}
                </PriceItem>
              );
            })}
          </ul>
        </div>
      </section>

      <Faq
        title={tc("faqQuestion")}
        items={data.faq.map((key) => ({ key, q: t(`faq.${key}.q`), a: t(`faq.${key}.a`) }))}
      />

      {/* Otras páginas */}
      <section aria-labelledby="related-title" className="bg-surface-sunken py-20 lg:py-24">
        <div className={container}>
          <SectionQuestion id="related-title" tone="white">
            {tc("relatedQuestion")}
          </SectionQuestion>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {relatedAudiences(audience).map((a) => (
              <AudienceTile
                key={a}
                className={AUDIENCE_STYLE[a].tile}
                href={localePath(locale, AUDIENCES[a].route)}
                age={tc(`audiences.${a}.age`)}
                title={tn(a)}
                body={tc(`audiences.${a}.ageText`)}
              />
            ))}
            <AudienceTile
              className="on-dark bg-brand-burgundy text-on-primary sm:col-span-2 lg:col-span-1"
              href={localePath(locale, "teachers")}
              age={tm("hello")}
              ageHidden
              title={tc("relatedTeachers")}
              body={tc("relatedTeachersBody")}
            />
          </ul>
          <p className="mt-8">
            <Link href={localePath(locale, "lessons")} className="inline-flex min-h-11 items-center gap-2 font-bold text-ink">
              {tc("relatedLessons")}
              <ArrowIcon />
            </Link>
            <span className="text-ink-muted"> · {tc("relatedLessonsBody")}</span>
          </p>
        </div>
      </section>

      <FreeLessonBand />
    </>
  );
}

/** Formatos disponibles: una columna por programa, cada formato con sus lugares. */
function Formats({ groups }: { groups: FormatGroup[] }) {
  const tc = useTranslations("common");
  const single = groups.length === 1;

  return (
    <section aria-labelledby="formats-title" className="bg-cream py-20 lg:py-28">
      <div className={container}>
        <SectionQuestion id="formats-title" tone="yellow" tail="right">
          {tc("formatsQuestion")}
        </SectionQuestion>
        <div className={`mt-12 grid gap-x-12 gap-y-14 ${single ? "" : "lg:grid-cols-2"}`}>
          {groups.map((group) => (
            <div key={group.key}>
              <h3 className="font-display text-[clamp(1.75rem,3.4vw,2.5rem)] leading-none text-brand-purple">
                {tc(`groups.${group.key}.title`)}
              </h3>
              <p className="mt-2 max-w-[34rem] text-lg leading-relaxed text-ink-muted">{tc(`groups.${group.key}.body`)}</p>
              <ul className={`mt-8 grid gap-x-8 gap-y-8 ${single ? "md:grid-cols-2" : ""}`}>
                {group.formats.map((f) => (
                  <li key={f.format} className="border-t-2 border-ink pt-5">
                    <People count={PEOPLE_BY_FORMAT[f.format]} />
                    <div className="mt-4">
                      <h4 className="text-xl font-extrabold text-ink">
                        {tc(`formats.${f.format}`)}
                        {f.maxTwo && <span className="font-semibold text-ink-muted"> · {tc("formats.maxTwo")}</span>}
                      </h4>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {f.places.map((place) => (
                          <li key={place} className="rounded-full bg-surface px-3.5 py-1.5 text-[0.9375rem] font-semibold text-ink ring-1 ring-ink/15">
                            {tc(`places.${place}`)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
