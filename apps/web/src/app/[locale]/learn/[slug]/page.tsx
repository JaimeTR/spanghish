import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FreeLessonBand } from "@/components/FreeLessonBand";
import { ArrowIcon } from "@/components/icons";
import { ArticleBlocks } from "@/components/learn/ArticleBlocks";
import { heroButtons, PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { container } from "@/components/styles";
import { isLocale } from "@/i18n/routing";
import { getPublicLesson, loadPublicLesson } from "@/lib/content-source";
import { learnLessonPath, localePath } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ locale: string; slug: string }> };

/** Las lecciones se publican en la administración: se generan al pedirlas, sin volver a desplegar. */
export const dynamicParams = true;
// Literal: Next lo lee en tiempo de compilación (igual a PLATFORM_REVALIDATE_SECONDS).
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

const pick = (es: string | null, en: string | null, locale: "es" | "en") =>
  (locale === "es" ? es?.trim() || en?.trim() : en?.trim() || es?.trim()) || "";

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const detail = await getPublicLesson(slug);
  if (!detail) return {};
  const t = await getTranslations({ locale, namespace: "page.learn" });
  const tm = await getTranslations({ locale, namespace: "meta" });
  const { lesson } = detail;
  return pageMetadata({
    locale,
    route: "learn",
    subpath: lesson.slug,
    title: t("articleMetaTitle", { title: pick(lesson.titleEs, lesson.titleEn, locale) }),
    description: pick(lesson.summaryEs, lesson.summaryEn, locale) || t("metaDescription"),
    ogAlt: tm("ogAlt"),
  });
}

/**
 * Lección artículo publicada en la plataforma (texto, imágenes, videos y
 * preguntas). Solo las abiertas a todo el mundo: una restringida o inexistente
 * es un 404 aquí (se lee en el portal, tras entrar). Si la plataforma no
 * responde, es un error y no un 404: así Next conserva la última versión buena
 * de la página en vez de guardar en caché un "no existe" de una lección real.
 */
export default async function ArticleLessonPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const loaded = await loadPublicLesson(slug);
  if (loaded.status === "unavailable") throw new Error("La plataforma no responde: lección no disponible por ahora.");
  if (loaded.status === "not_found") notFound();
  const { detail } = loaded;

  const t = await getTranslations({ locale, namespace: "page.learn" });
  const tl = await getTranslations({ locale, namespace: "page.lesson" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const tv = await getTranslations({ locale, namespace: "videos" });
  const { lesson, blocks } = detail;
  const title = pick(lesson.titleEs, lesson.titleEn, locale);
  const summary = pick(lesson.summaryEs, lesson.summaryEn, locale);
  const path = learnLessonPath(locale, lesson.slug);
  const buttons = heroButtons("yellow");

  return (
    <PageShell
      locale={locale}
      route="learn"
      jsonLd={[
        breadcrumbJsonLd([
          { name: tn("homeCrumb"), path: localePath(locale, "home") },
          { name: tn("resources"), path: localePath(locale, "resources") },
          { name: tn("learn"), path: localePath(locale, "learn") },
          { name: title, path },
        ]),
      ]}
    >
      <PageHero
        tone="yellow"
        crumbs={[
          { label: tn("homeCrumb"), href: localePath(locale, "home") },
          { label: tn("resources"), href: localePath(locale, "resources") },
          { label: tn("learn"), href: localePath(locale, "learn") },
          { label: title, href: path },
        ]}
        titleA={title}
        lead={
          <>
            {summary && <p>{summary}</p>}
            <p className={`text-base font-semibold ${summary ? "mt-4" : ""}`}>
              {lesson.levelCode ? `${t("items.level", { level: lesson.levelCode })} · ` : ""}
              {t("article")}
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
      />

      <article id="lesson" tabIndex={-1} aria-label={title} className="bg-cream py-16 outline-none lg:py-20">
        <div className={container}>
          <div className="max-w-[44rem]">
            <ArticleBlocks
              blocks={blocks}
              locale={locale}
              labels={{
                play: tv("play"),
                videoTitle: t("articleVideo", { title }),
                quiz: { check: t("quiz.check"), choose: t("quiz.choose"), correct: t("quiz.correct"), incorrect: t("quiz.incorrect") },
              }}
            />
          </div>
        </div>
      </article>

      <nav aria-label={tl("nav")} className="border-t-2 border-ink/10 bg-cream py-10">
        <div className={container}>
          <Link
            href={localePath(locale, "learn")}
            className="inline-flex min-h-14 items-center rounded-full font-bold text-ink underline decoration-2 underline-offset-4 hover:decoration-[3px]"
          >
            ← {tl("hub")}
          </Link>
        </div>
      </nav>

      <FreeLessonBand />
    </PageShell>
  );
}
