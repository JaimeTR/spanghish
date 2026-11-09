import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AUDIENCE_STYLE } from "@/components/audience-style";
import { AudienceTile } from "@/components/AudienceTile";
import { Bubble, SectionQuestion } from "@/components/Bubble";
import { BubbleThread, MinutesBadge } from "@/components/BubbleThread";
import { FreeLessonBand } from "@/components/FreeLessonBand";
import { ArrowIcon, CheckIcon } from "@/components/icons";
import { HeroChat, heroButtons, PageHero } from "@/components/PageHero";
import { container } from "@/components/styles";
import { TeacherPhoto } from "@/components/TeacherPhoto";
import type { Locale } from "@/i18n/routing";
import { AUDIENCES, type Audience } from "@/lib/lessons";
import { bookingPath, localePath } from "@/lib/routes";
import { teacherPath } from "@/lib/teachers";
import type { TeacherView } from "@/lib/teachers-source";

const APPROACH = ["practical", "grammar", "materials", "summary"] as const;

/**
 * Perfil de una docente: cabecera con la pregunta del visitante, su foto y
 * datos clave, y (según la docente) su especialidad, cómo da clase y a quién.
 * Los datos vienen ya resueltos al idioma (`TeacherView`).
 */
export async function TeacherProfile({ locale, teacher }: { locale: Locale; teacher: TeacherView }) {
  const t = await getTranslations({ locale, namespace: "page.teachers" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const tl = await getTranslations({ locale, namespace: "lessons" });
  const buttons = heroButtons("burgundy");
  const firstName = teacher.name.split(" ")[0] ?? teacher.name;
  const nameId = "teacher-name";

  return (
    <>
      <PageHero
        tone="burgundy"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: t("title"), href: localePath(locale, "teachers") },
          { label: teacher.name, href: teacherPath(locale, teacher.slug) },
        ]}
        titleA={teacher.name}
        lead={<p>{teacher.tagline}</p>}
        actions={
          <Link href={bookingPath(locale)} className={buttons.primary}>
            {tc("freeLesson.cta")}
            <ArrowIcon />
          </Link>
        }
        aside={<HeroChat ask={t("ask")} answer={t("answerOne", { name: firstName })} answerTone="yellow" />}
      />

      <section aria-labelledby={nameId} className="bg-cream py-20 lg:py-28">
        <div className={`${container} grid gap-14 lg:grid-cols-12 lg:items-start`}>
          <div className="lg:col-span-7">
            <h2 id={nameId} className="lettering font-display text-[clamp(3rem,8vw,5.5rem)] leading-[0.95] text-brand-fuchsia">
              {teacher.name}
            </h2>
            <p className="mt-3 font-display text-[1.75rem] leading-tight text-brand-purple">{teacher.role}</p>
            <Bubble tone="yellow" tail="left" shadow className="mt-10 max-w-[38rem]" boxClassName="px-7 py-6 sm:px-9 sm:py-7">
              <p className="font-display text-[clamp(1.5rem,3.4vw,2rem)] leading-[1.15] text-ink">{teacher.intro}</p>
            </Bubble>
            <p className="mt-8 max-w-[38rem] text-xl leading-relaxed text-ink">{teacher.body}</p>
          </div>
          <div className="flex flex-col gap-10 lg:col-span-5 lg:pt-4">
            <TeacherPhoto teacher={teacher} priority className="mx-auto w-[min(78%,19rem)] lg:mx-0" />
            <div className="rounded-lg bg-brand-purple p-7 text-on-structure sm:p-9">
              <h3 className="font-display text-[1.75rem] leading-tight text-brand-yellow">{t("factsLabel", { name: firstName })}</h3>
              <ul className="mt-5 flex flex-col gap-4">
                {teacher.facts.map((fact) => (
                  <li key={fact} className="flex items-start gap-3 text-lg leading-snug font-semibold">
                    <CheckIcon />
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {!teacher.showApproach && teacher.specialty && (
        <section aria-labelledby="teacher-specialty" className="on-dark bg-brand-purple py-20 text-on-structure lg:py-28">
          <div className={`${container} grid gap-12 lg:grid-cols-12 lg:gap-10`}>
            <div className="lg:col-span-5">
              <SectionQuestion id="teacher-specialty" tone="white">
                {t("specialtyLabel")}
              </SectionQuestion>
            </div>
            <div className="lg:col-span-7 lg:pt-2">
              <p className="max-w-[40rem] text-xl leading-relaxed">{teacher.specialty}</p>
              {teacher.enrol && teacher.enrolTitle && (
                <div className="mt-10">
                  <h3 className="font-display text-[1.75rem] leading-tight text-brand-yellow">{teacher.enrolTitle}</h3>
                  <p className="mt-3 max-w-[40rem] text-lg leading-relaxed">{teacher.enrol}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {teacher.showApproach && (
        <>
          <section aria-labelledby="approach-title" className="on-dark bg-brand-purple py-20 text-on-structure lg:py-28">
            <div className={`${container} grid gap-12 lg:grid-cols-12 lg:gap-10`}>
              <div className="lg:col-span-5">
                <SectionQuestion id="approach-title" tone="white">
                  {t("approachQuestion")}
                </SectionQuestion>
                <div className="mt-12">
                  <MinutesBadge minutes={tc("minutes")} label={tc("minutesLabel")} />
                </div>
                <p className="mt-5 max-w-[26rem] text-lg leading-relaxed">{t("approachIntro")}</p>
              </div>
              <div className="lg:col-span-7 lg:pt-2">
                <BubbleThread
                  items={APPROACH.map((key) => ({ key, title: t(`approach.${key}.title`), body: t(`approach.${key}.body`) }))}
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="classes-title" className="bg-cream py-20 lg:py-28">
            <div className={container}>
              <SectionQuestion id="classes-title" tone="yellow">
                {t("classesQuestion")}
              </SectionQuestion>
              <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                {(Object.keys(AUDIENCES) as Audience[]).map((a) => (
                  <AudienceTile
                    key={a}
                    className={AUDIENCE_STYLE[a].tile}
                    href={localePath(locale, AUDIENCES[a].route)}
                    age={tc(`audiences.${a}.age`)}
                    title={tn(a)}
                    body={tl(`${a}.body`)}
                  />
                ))}
              </ul>
            </div>
          </section>
        </>
      )}

      <FreeLessonBand />
    </>
  );
}
