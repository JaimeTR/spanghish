import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, Section, buttonLinkClass } from "@/components/admin/PageHeader";
import { MoveButtons } from "@/components/content/MoveButtons";
import { isLocale } from "@/i18n/routing";
import { listAdminLessons, listLevels } from "@/lib/data/content";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { moveLesson } from "./actions";
import { PublishToggle } from "./PublishToggle";

const categories = ["foundations", "kids", "adults", "stories", "games"] as const;
export default async function LessonsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); await requireArea(locale, "admin");
  const [t, db] = await Promise.all([getTranslations({ locale, namespace: "content.lessons" }), createClient()]);
  const [lessons, levels] = await Promise.all([listAdminLessons(db), listLevels(db)]);
  return <><PageHeader title={t("title")} intro={t("intro")} action={<Link className={buttonLinkClass} href={`/${locale}/admin/lessons/new`}>{t("new")}</Link>} />
    {categories.map((category) => <Section key={category} id={`category-${category}`} title={t(`categoryNames.${category}`)}>
      {category === "foundations" ? <LessonList category={category} level={null} lessons={lessons.filter((row) => row.category === category)} locale={locale} t={t} /> : levels.map((level) => <div key={level.id} className="border-b border-line py-4 last:border-0"><h3 className="font-semibold">{level.code}</h3><LessonList category={category} level={level} lessons={lessons.filter((row) => row.category === category && row.level_id === level.id)} locale={locale} t={t} /></div>)}
    </Section>)}
  </>;
}
function LessonList({ category, level, lessons, locale, t }: { category: string; level: { id: string; code: string } | null; lessons: Awaited<ReturnType<typeof listAdminLessons>>; locale: string; t: Awaited<ReturnType<typeof getTranslations>> }) {
  return <div className="mt-2"><Link className="underline" href={`/${locale}/admin/lessons/new?category=${category}${level ? `&level=${level.code}` : ""}`}>{t("addAtLevel", { level: level?.code ?? t("categoryNames.foundations") })}</Link>
    {!lessons.length ? <p className="mt-2 text-sm text-text-muted">{t("empty")}</p> : <ul className="mt-2 divide-y divide-line">{lessons.map((lesson, index) => <li key={lesson.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><span><Link className="font-medium underline" href={`/${locale}/admin/lessons/${lesson.id}`}>{locale === "es" ? lesson.title_es : lesson.title_en}</Link> · {lesson.levelCode ?? "—"} · {t(`kindNames.${lesson.kind}`)} · {t(`statusNames.${lesson.status}`)}</span><div className="flex gap-2"><MoveButtons id={lesson.id} action={moveLesson} first={index === 0} last={index === lessons.length - 1} labelUp={t("moveUp", { title: lesson.title_es })} labelDown={t("moveDown", { title: lesson.title_es })} locale={locale} /><PublishToggle id={lesson.id} locale={locale} published={lesson.status === "published"} /></div></li>)}</ul>}
  </div>;
}
