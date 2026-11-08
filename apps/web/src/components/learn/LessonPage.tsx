import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { lessonNeighbours, type LessonRoute } from "@/lib/learn/catalog";
import { crumbsJsonLd } from "@/lib/page-meta";
import { localePath } from "@/lib/routes";
import { learningResourceJsonLd } from "@/lib/structured-data";
import { FreeLessonBand } from "../FreeLessonBand";
import { ArrowIcon } from "../icons";
import { HeroChat, heroButtons, PageHero } from "../PageHero";
import { PageShell } from "../PageShell";
import { container } from "../styles";

const NAMESPACE: Record<LessonRoute, "learnAlphabet" | "learnNouns"> = {
  learnAlphabet: "learnAlphabet",
  learnNouns: "learnNouns",
};

/**
 * Página de una lección copiada de la web anterior: migas (Inicio > Recursos >
 * Aprende ahora > lección), h1 con el título publicado (en inglés), la lección,
 * lección anterior / siguiente y la clase gratis.
 * El contenido de la lección está en inglés (para quien aprende español) y
 * marca con lang="es" lo que está en español. No hay versión en español.
 */
export async function LessonPage({
  locale,
  route,
  teaches,
  educationalLevel,
  children,
}: {
  locale: Locale;
  route: LessonRoute;
  teaches: string;
  educationalLevel?: string;
  children: ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: `page.${NAMESPACE[route]}` });
  const tl = await getTranslations({ locale, namespace: "page.lesson" });
  const ti = await getTranslations({ locale, namespace: "page.learn.items" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const path = localePath(locale, route);
  const crumbs = await crumbsJsonLd(locale, [
    { route: "resources", name: tn("resources") },
    { route: "learn", name: tn("learn") },
    { route, name: t("crumb") },
  ]);
  const resource = learningResourceJsonLd({ path, name: t("title"), description: t("metaDescription"), teaches, educationalLevel });
  const { prev, next } = lessonNeighbours(route);
  const buttons = heroButtons("yellow");

  return (
    <PageShell locale={locale} route={route} jsonLd={[crumbs, resource]}>
      <PageHero
        tone="yellow"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: tn("resources"), href: localePath(locale, "resources") },
          { label: tn("learn"), href: localePath(locale, "learn") },
          { label: t("crumb"), href: path },
        ]}
        titleA={t("title")}
        titleLang={locale === "es" ? "en" : undefined}
        lead={
          <>
            <p>{t("lead")}</p>
            <p className="mt-4 text-base font-semibold">
              {locale === "es" && <>{tl("englishNote")} </>}
              {tl("speechNote")}
            </p>
          </>
        }
        actions={
          <>
            <a href="#lesson" className={buttons.primary}>
              {tl("start")}
              <ArrowIcon />
            </a>
            <Link href={localePath(locale, "learn")} className={buttons.secondary}>
              {tl("hub")}
            </Link>
          </>
        }
        aside={<HeroChat ask={t("ask")} answer={t("answer")} answerTone="fuchsia" />}
      />

      <div id="lesson" tabIndex={-1} className="outline-none">
        {children}
      </div>

      <nav aria-label={tl("nav")} className="border-t-2 border-ink/10 bg-cream py-10">
        <ul className={`${container} grid gap-4 sm:grid-cols-3`}>
          <li>
            {prev && (
              <Link href={localePath(locale, prev.route)} className="group flex min-h-14 flex-col justify-center rounded-[1.25rem] px-4 py-2 text-ink no-underline ring-2 ring-ink/15 transition-colors duration-200 hover:bg-ink/8">
                <span className="text-sm font-semibold text-ink-muted">← {tl("prev")}</span>
                <span className="font-bold decoration-brand-fuchsia decoration-[3px] group-hover:underline">{ti(prev.label)}</span>
              </Link>
            )}
          </li>
          <li className="sm:text-center">
            <Link href={localePath(locale, "learn")} className="inline-flex min-h-14 items-center justify-center rounded-full px-5 font-bold text-ink underline decoration-2 underline-offset-4 hover:decoration-[3px]">
              {tl("hub")}
            </Link>
          </li>
          <li>
            {next && (
              <Link href={localePath(locale, next.route)} className="group flex min-h-14 flex-col items-end justify-center rounded-[1.25rem] px-4 py-2 text-right text-ink no-underline ring-2 ring-ink/15 transition-colors duration-200 hover:bg-ink/8">
                <span className="text-sm font-semibold text-ink-muted">{tl("next")} →</span>
                <span className="font-bold decoration-brand-fuchsia decoration-[3px] group-hover:underline">{ti(next.label)}</span>
              </Link>
            )}
          </li>
        </ul>
      </nav>

      <FreeLessonBand />
    </PageShell>
  );
}
