import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { AUDIENCES, type Audience } from "@/lib/lessons";
import { PRICE_VALUES } from "@/lib/prices";
import { bookingPath, localePath } from "@/lib/routes";
import { CONTACT } from "@/lib/site";
import { AUDIENCE_STYLE } from "../audience-style";
import { AudienceTile } from "../AudienceTile";
import { SectionQuestion } from "../Bubble";
import { BubbleThread, MinutesBadge } from "../BubbleThread";
import { Faq } from "../Faq";
import { FreeLessonBand } from "../FreeLessonBand";
import { ArrowIcon, SparkIcon } from "../icons";
import { HeroChat, heroButtons, PageHero } from "../PageHero";
import { PriceItem } from "../PriceItem";
import { Steps } from "../Steps";
import { btnInk, btnPrimary, container } from "../styles";

const ACTIVITIES = ["coffee", "people", "guided"] as const;
const FACTS = ["format", "level", "length", "lesson"] as const;
const SIGNUP = ["free", "reply", "start"] as const;
const FAQ = ["level", "length", "upfront", "when"] as const;
const AUDIENCE_KEYS = Object.keys(AUDIENCES) as Audience[];

/**
 * Conversación online (programa de 10 semanas, nivel intermedio). Mismo
 * recorrido que las páginas por edad: quién → cómo es una clase → programa y
 * precio → cómo apuntarse → dudas → otras clases → clase gratis.
 * Solo datos publicados en spanglish.com.au; las fechas cambian en cada
 * edición y no se publican aquí.
 */
export function OnlineConversationsPage({ locale }: { locale: Locale }) {
  const t = useTranslations("page.online");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const th = useTranslations("hero");
  const buttons = heroButtons("burgundy");

  return (
    <>
      <PageHero
        tone="burgundy"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: tn("lessons"), href: localePath(locale, "lessons") },
          { label: tn("online"), href: localePath(locale, "online") },
        ]}
        titleA={t("title")}
        lead={
          <>
            <p>
              <span className="mr-2 inline-block rounded-full bg-brand-yellow px-3 py-1 align-[0.15em] text-sm font-bold text-ink">
                {t("tag")}
              </span>
              {t("lead")}
            </p>
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
            <a href="#program" className={buttons.secondary}>
              {t("seeDetails")}
            </a>
          </>
        }
        aside={<HeroChat ask={t("ask")} answer={t("answer")} answerTone="yellow" />}
      />

      {/* Para quién */}
      <section aria-labelledby="who-title" className="bg-cream py-20 lg:py-28">
        <div className={container}>
          <SectionQuestion id="who-title" tone="yellow">
            {t("who.question")}
          </SectionQuestion>
          <p className="mt-8 max-w-[44rem] text-xl leading-relaxed text-ink sm:text-2xl sm:leading-relaxed">{t("who.body")}</p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {(["level", "online", "people"] as const).map((key) => (
              <li key={key} className="on-dark rounded-full bg-brand-burgundy px-4 py-2 font-bold text-on-primary">
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
              <MinutesBadge minutes={t("minutes")} label={t("minutesLabel")} />
            </div>
            <p className="mt-5 max-w-[26rem] text-lg leading-relaxed">{t("how.intro")}</p>
          </div>
          <div className="lg:col-span-7 lg:pt-2">
            <BubbleThread items={ACTIVITIES.map((key) => ({ key, title: t(`how.${key}.title`), body: t(`how.${key}.body`) }))} />
          </div>
        </div>
      </section>

      {/* Programa: formato, nivel, duración y precio */}
      <section id="program" aria-labelledby="program-title" className="bg-surface-sunken py-20 lg:py-28">
        <div className={container}>
          <SectionQuestion id="program-title" tone="fuchsia">
            {t("facts.question")}
          </SectionQuestion>
          <dl className="mt-12 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map((key) => (
              <div key={key} className="border-t-2 border-ink pt-4">
                <dt className="font-semibold text-ink-muted">{t(`facts.${key}.label`)}</dt>
                <dd className="mt-1 font-display text-[1.75rem] leading-tight text-brand-purple">{t(`facts.${key}.value`)}</dd>
              </div>
            ))}
          </dl>

          <ul className="mt-14 grid border-t-2 border-ink md:grid-cols-3">
            <PriceItem
              highlight
              amount={tc("prices.free.amount")}
              title={tc("prices.free.title")}
              body={tc("prices.free.body")}
            />
            {(["upfront", "lesson"] as const).map((key) => (
              <PriceItem
                key={key}
                amount={t(`prices.${key}.amount`, PRICE_VALUES)}
                unit={t(`prices.${key}.unit`)}
                title={t(`prices.${key}.title`)}
                body={t(`prices.${key}.body`)}
              />
            ))}
          </ul>
          <p className="mt-6 text-lg text-ink-muted">{t("pricesNote")}</p>

          <div className="mt-10 flex flex-col items-start gap-4 rounded-lg border-2 border-dashed border-ink/25 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <h3 className="text-xl font-extrabold text-ink">{t("datesTitle")}</h3>
              <p className="mt-1 max-w-[38rem] leading-relaxed text-ink-muted">{t("datesBody")}</p>
            </div>
            <a href={`mailto:${CONTACT.email}`} className={`${btnInk} !min-h-11 shrink-0 !px-5 !text-base`}>
              {t("datesCta")}
              <span className="sr-only">: {CONTACT.email}</span>
            </a>
          </div>
        </div>
      </section>

      {/* Cómo apuntarse */}
      <section aria-labelledby="signup-title" className="bg-cream py-20 lg:py-28">
        <div className={container}>
          <SectionQuestion id="signup-title" tone="yellow" tail="right">
            {t("signupQuestion")}
          </SectionQuestion>
          <div className="mt-12">
            <Steps items={SIGNUP.map((key) => ({ key, title: t(`signup.${key}.title`), body: t(`signup.${key}.body`) }))} />
          </div>
          <p className="mt-10">
            <Link href={bookingPath(locale)} className={btnPrimary}>
              {tc("freeLesson.cta")}
              <ArrowIcon />
            </Link>
          </p>
        </div>
      </section>

      <Faq
        title={tc("faqQuestion")}
        items={FAQ.map((key) => ({ key, q: t(`faq.${key}.q`), a: t(`faq.${key}.a`, PRICE_VALUES) }))}
      />

      {/* Otras clases */}
      <section aria-labelledby="related-title" className="bg-surface-sunken py-20 lg:py-24">
        <div className={container}>
          <SectionQuestion id="related-title" tone="white">
            {tc("relatedQuestion")}
          </SectionQuestion>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {AUDIENCE_KEYS.map((a, i) => (
              <AudienceTile
                key={a}
                className={`${AUDIENCE_STYLE[a].tile} ${i === 0 ? "sm:col-span-2 lg:col-span-1" : ""}`}
                href={localePath(locale, AUDIENCES[a].route)}
                age={tc(`audiences.${a}.age`)}
                title={tn(a)}
                body={tc(`audiences.${a}.ageText`)}
              />
            ))}
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
