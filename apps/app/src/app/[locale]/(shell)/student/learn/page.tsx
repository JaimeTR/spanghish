import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { PublishedLessonSummary } from "@spanglish/content";
import { isLocale } from "@/i18n/routing";
import { listPortalLessons } from "@/lib/data/content";
import { groupLessons, LEARN_LEVELS } from "@/lib/content-groups";
import { createClient } from "@/lib/supabase/server";
import { requireArea } from "@/lib/require-area";

export default async function StudentLearnPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params; if (!isLocale(rawLocale)) notFound(); const locale = rawLocale;
  setRequestLocale(locale); await requireArea(locale, "student");
  const [t, lessons] = await Promise.all([getTranslations({ locale, namespace: "studentContent.learn" }), createClient().then(listPortalLessons)]);
  const groups = groupLessons(lessons); const labels = { empty: t("empty"), locked: t("locked"), newWindow: t("newWindow") };
  return <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6"><header className="rounded-[var(--shape-lg)] bg-brand-yellow p-6 text-ink"><p className="text-sm font-semibold">{t("eyebrow")}</p><h1 className="mt-1 text-3xl font-extrabold">{t("title")}</h1><p className="mt-2">{t("intro")}</p></header>
    <div className="mt-8 space-y-10">{groups.map(({ category, lessons: rows }) => <section key={category} aria-labelledby={`learn-${category}`}><h2 id={`learn-${category}`} className="mb-4 text-2xl font-extrabold text-brand-purple">{t(`categories.${category}`)}</h2>
      {category === "foundations" ? <div className="mb-5"><h3 className="mb-3 text-lg font-bold">{t("foundations")}</h3><LessonList rows={rows.filter((lesson) => lesson.levelCode === null)} locale={locale} labels={labels} /></div> : null}
      {LEARN_LEVELS.map((level) => <div key={level} className="mb-5"><h3 className="mb-3 text-lg font-bold">{level}</h3><LessonList rows={rows.filter((lesson) => lesson.levelCode === level)} locale={locale} labels={labels} /></div>)}
    </section>)}</div></div>;
}

function LessonList({ rows, locale, labels }: { rows: PublishedLessonSummary[]; locale: "es" | "en"; labels: { empty: string; locked: string; newWindow: string } }) {
  if (rows.length === 0) return <p className="rounded-xl bg-surface-sunken p-4 text-text-muted">{labels.empty}</p>;
  return <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">{rows.map((lesson) => {
    const title = locale === "es" ? lesson.titleEs : lesson.titleEn; const summary = locale === "es" ? lesson.summaryEs : lesson.summaryEn;
    const interactiveHref = process.env.NEXT_PUBLIC_WEB_URL ? `${process.env.NEXT_PUBLIC_WEB_URL.replace(/\/$/, "")}/${locale}/learn/${lesson.slug}` : undefined;
    const href = lesson.locked ? undefined : lesson.kind === "article" ? `/${locale}/student/learn/${lesson.slug}` : interactiveHref;
    const body = <><span aria-hidden="true">{lesson.locked ? "🔒 " : lesson.kind === "interactive" ? "✦ " : "📖 "}</span><span className="font-bold">{title}</span>{summary ? <span className="mt-2 block text-sm font-normal text-text-muted">{summary}</span> : null}{lesson.locked ? <span className="mt-3 block text-sm font-semibold">{labels.locked}</span> : null}</>;
    return <li key={lesson.id} className="rounded-[var(--shape-md)] border border-line bg-surface p-4">{href ? <Link className="block min-h-11 rounded focus-visible:outline-[var(--focus-ring)]" href={href} target={lesson.kind === "interactive" ? "_blank" : undefined} rel={lesson.kind === "interactive" ? "noopener noreferrer" : undefined}>{body}{lesson.kind === "interactive" ? <span className="sr-only"> ({labels.newWindow})</span> : null}</Link> : <div>{body}</div>}</li>;
  })}</ul>;
}
