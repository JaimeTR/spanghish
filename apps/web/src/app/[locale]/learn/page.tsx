import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Bubble, SectionQuestion, type BubbleTone } from "@/components/Bubble";
import { FreeLessonBand } from "@/components/FreeLessonBand";
import { ArrowIcon, LockIcon } from "@/components/icons";
import { HeroChat, heroButtons, PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { btnInk, btnPrimary, container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { getLearnCategories } from "@/lib/content-source";
import { isReady, type LearnCategory, type LearnItem } from "@/lib/learn/catalog";
import { crumbsJsonLd, innerPageMetadata, type PageProps } from "@/lib/page-meta";
import { bookingPath, learnLessonPath, localePath } from "@/lib/routes";
import { appLoginUrl } from "@/lib/site";

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "learn", "learn");
}

// Literal: Next lo lee en tiempo de compilación (igual a PLATFORM_REVALIDATE_SECONDS).
export const revalidate = 300;

/**
 * Aprende ahora: el menú de lecciones, con lo publicado en la plataforma o, si no
 * responde, el de la web anterior (ver lib/learn/catalog.ts). Lo publicado enlaza a
 * su lección (lo restringido, al login del portal); lo demás se ve como
 * "Próximamente", sin enlace.
 * JSON-LD: solo migas (no hay datos suficientes para un Course).
 */
export default async function LearnPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "page.learn" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const crumbs = await crumbsJsonLd(locale, [
    { route: "resources", name: tn("resources") },
    { route: "learn", name: tn("learn") },
  ]);
  const buttons = heroButtons("purple");
  const { categories } = await getLearnCategories();

  const itemLabel = (item: LearnItem, category: LearnCategory["key"]) => {
    if (item.title) {
      const title = item.title[locale];
      return item.level && category !== "foundations" ? t("items.levelWith", { level: item.level, lesson: title }) : title;
    }
    if (item.label) return t(`items.${item.label}`);
    if (item.lesson) return t("items.levelWith", { level: item.level!, lesson: t(`items.${item.lesson === "learnNouns" ? "nouns" : "alphabet"}`) });
    return t("items.level", { level: item.level! });
  };

  /** Destino de un elemento publicado; null si es "Próximamente". */
  const itemLink = (item: LearnItem) => {
    if (item.locked) return item.slug ? { href: appLoginUrl(locale, `/${locale}/student/learn/${item.slug}`), note: t("locked"), locked: true } : null;
    if (item.lesson) return { href: localePath(locale, item.lesson), note: t("available"), locked: false };
    if (item.slug) return { href: learnLessonPath(locale, item.slug), note: t("article"), locked: false };
    return null;
  };

  return (
    <PageShell locale={locale} route="learn" jsonLd={[crumbs]}>
      <PageHero
        tone="purple"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: tn("resources"), href: localePath(locale, "resources") },
          { label: tn("learn"), href: localePath(locale, "learn") },
        ]}
        titleA={t("title")}
        lead={
          <>
            <p>{t("lead")}</p>
            <p className="mt-4 text-base font-semibold">{t("englishNote")}</p>
          </>
        }
        actions={
          <>
            <a href="#lessons" className={buttons.primary}>
              {t("toLessons")}
              <ArrowIcon />
            </a>
            <Link href={localePath(locale, "shop")} className={buttons.secondary}>
              {t("toShop")}
            </Link>
          </>
        }
        aside={<HeroChat ask={t("ask")} answer={t("answer")} answerTone="yellow" />}
      />

      <section id="lessons" aria-labelledby="lessons-title" className="bg-cream py-20 lg:py-28">
        <div className={container}>
          <div className="flex flex-col items-start gap-4">
            <SectionQuestion id="lessons-title" tone="fuchsia">
              {t("question")}
            </SectionQuestion>
            <p className="max-w-[40rem] text-lg leading-relaxed text-ink-muted">{t("intro")}</p>
          </div>

          <div className="mt-14 grid gap-x-6 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, i) => {
              const ready = cat.items.filter(isReady).length;
              return (
                <section key={cat.key} aria-labelledby={`cat-${cat.key}`} className={cat.key === "foundations" ? "md:col-span-2 lg:col-span-1" : undefined}>
                  <Bubble tone={cat.tone as BubbleTone} tail={i % 2 ? "right" : "left"} shadow className="max-w-full" boxClassName={`px-6 py-4 ${cat.tone === "white" ? "ring-2 ring-ink/10" : ""}`}>
                    <h3 id={`cat-${cat.key}`} className="font-display text-[2rem] leading-none">
                      {t(`categories.${cat.key}.title`)}
                    </h3>
                    <p className="mt-1.5 font-semibold">{t(`categories.${cat.key}.intro`)}</p>
                  </Bubble>
                  <p className="mt-6 text-sm font-bold tracking-wide text-brand-purple uppercase">{t("countReady", { count: ready })}</p>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {cat.items.map((item) => {
                      const link = itemLink(item);
                      if (!link) {
                        return (
                          <li key={item.key} className="flex min-h-12 items-center justify-between gap-3 rounded-[1.25rem] border-2 border-dashed border-ink/25 px-4 py-2">
                            <span className="font-semibold text-ink-muted">{itemLabel(item, cat.key)}</span>
                            <span className="rounded-full bg-ink/8 px-2.5 py-0.5 text-sm font-bold text-ink">{t("soon")}</span>
                          </li>
                        );
                      }
                      const tile =
                        "group flex min-h-14 items-center gap-3 rounded-[1.25rem] bg-surface py-2 pr-2 pl-4 font-bold text-ink no-underline ring-1 ring-ink/10 transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0";
                      const body = (
                        <>
                          <span className="flex-1">
                            <span className="decoration-brand-fuchsia decoration-[3px] group-hover:underline">{itemLabel(item, cat.key)}</span>
                            <span className="block text-sm font-semibold text-ink-muted">{link.note}</span>
                          </span>
                          {link.locked ? (
                            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-cream">
                              <LockIcon />
                            </span>
                          ) : (
                            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-ink transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none">
                              <ArrowIcon />
                            </span>
                          )}
                        </>
                      );
                      return (
                        <li key={item.key}>
                          {link.locked ? (
                            // Otra web (el portal): enlace normal, sin precarga.
                            <a href={link.href} className={tile}>
                              {body}
                            </a>
                          ) : (
                            <Link href={link.href} className={tile}>
                              {body}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-labelledby="portal-title" className="bg-surface-sunken py-20 lg:py-24">
        <div className={`${container} grid gap-12 lg:grid-cols-12`}>
          <div className="lg:col-span-5">
            <SectionQuestion id="portal-title" tone="purple" tail="left">
              {t("portal.question")}
            </SectionQuestion>
            <p className="mt-8 max-w-[36rem] text-lg leading-relaxed text-ink">{t("portal.body")}</p>
          </div>
          <div className="lg:col-span-7">
            <h2 className="sr-only">{t("more.question")}</h2>
            <ul className="grid gap-5 sm:grid-cols-2">
              <li className="flex flex-col items-start rounded-[1.75rem] bg-surface p-6 ring-1 ring-ink/10">
                <h3 className="font-display text-[1.75rem] leading-tight text-brand-burgundy">{t("more.shop.title")}</h3>
                <p className="mt-2 flex-1 text-lg leading-relaxed text-ink">{t("more.shop.body")}</p>
                <Link href={localePath(locale, "shop")} className={`${btnInk} mt-5 !min-h-11 !px-5 !text-base`}>
                  {t("more.shop.cta")}
                  <ArrowIcon />
                </Link>
              </li>
              <li className="flex flex-col items-start rounded-[1.75rem] bg-surface p-6 ring-1 ring-ink/10">
                <h3 className="font-display text-[1.75rem] leading-tight text-brand-burgundy">{t("more.lesson.title")}</h3>
                <p className="mt-2 flex-1 text-lg leading-relaxed text-ink">{t("more.lesson.body")}</p>
                <Link href={bookingPath(locale)} className={`${btnPrimary} mt-5 !min-h-11 !px-5 !text-base`}>
                  {t("more.lesson.cta")}
                  <ArrowIcon />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <FreeLessonBand />
    </PageShell>
  );
}
