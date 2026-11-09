import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { FreeLessonBand } from "@/components/FreeLessonBand";
import { MaribelPhoto } from "@/components/MaribelPhoto";
import { ArrowIcon } from "@/components/icons";
import { HeroChat, heroButtons, PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { crumbsJsonLd, innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { bookingPath, localePath } from "@/lib/routes";
import { TEACHERS, teacherPath } from "@/lib/teachers";

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "teachers", "teachers");
}

export default async function TeachersPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "page.teachers" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const buttons = heroButtons("burgundy");

  const cards = await Promise.all(
    TEACHERS.map(async (teacher) => {
      const p = await getTranslations({ locale, namespace: `page.teachers.people.${teacher.key}` });
      return { teacher, role: p("role"), tagline: p("tagline"), alt: p("photoAlt") };
    }),
  );

  return (
    <PageShell locale={locale} route="teachers" jsonLd={[await crumbsJsonLd(locale, [{ route: "teachers", name: t("title") }])]}>
      <PageHero
        tone="burgundy"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: t("title"), href: localePath(locale, "teachers") },
        ]}
        titleA={t("title")}
        lead={<p>{t("lead")}</p>}
        actions={
          <Link href={bookingPath(locale)} className={buttons.primary}>
            {tc("freeLesson.cta")}
            <ArrowIcon />
          </Link>
        }
        aside={<HeroChat ask={t("ask")} answer={t("answer")} answerTone="yellow" />}
      />

      <section aria-labelledby="team-title" className="bg-cream py-20 lg:py-28">
        <div className={container}>
          <h2 id="team-title" className="sr-only">
            {t("title")}
          </h2>
          <ul className="grid gap-14 sm:grid-cols-2 lg:gap-16">
            {cards.map(({ teacher, role, tagline, alt }) => (
              <li
                key={teacher.slug}
                className="group/card relative flex flex-col items-center gap-8 text-center sm:items-start sm:text-left"
              >
                <MaribelPhoto
                  alt={alt}
                  src={teacher.photo}
                  position={teacher.photoPosition}
                  sizes="(min-width: 640px) 22rem, 70vw"
                  className="w-[min(78%,18rem)]"
                />
                <div>
                  <h3 className="lettering font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-[0.95] text-brand-fuchsia">
                    {/* Enlace extendido: toda la tarjeta es clicable y el nombre accesible es solo el nombre. */}
                    <Link
                      href={teacherPath(locale, teacher.slug)}
                      className="no-underline after:absolute after:inset-0 after:content-['']"
                    >
                      {teacher.name}
                    </Link>
                  </h3>
                  <p className="mt-3 font-display text-2xl leading-tight text-brand-purple">{role}</p>
                  <p className="mt-3 max-w-[26rem] text-lg leading-relaxed text-ink">{tagline}</p>
                  <span
                    aria-hidden="true"
                    className="mt-5 inline-flex items-center gap-2 font-bold text-brand-fuchsia underline-offset-4 group-hover/card:underline"
                  >
                    {t("viewProfile")}
                    <ArrowIcon />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FreeLessonBand />
    </PageShell>
  );
}
