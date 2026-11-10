import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, Section, StatusBadge } from "@/components/admin/PageHeader";
import { MoveButtons } from "@/components/content/MoveButtons";
import { IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { listAdminLessons, listLevels } from "@/lib/data/content";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { moveLesson } from "./actions";
import { DeleteLessonButton } from "./DeleteLessonButton";
import { LessonForm } from "./LessonForm";
import { PublishToggle } from "./PublishToggle";

const categories = ["foundations", "kids", "adults", "stories", "games"] as const;
type Levels = Awaited<ReturnType<typeof listLevels>>;

export default async function LessonsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ category?: string; level?: string; new?: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); await requireArea(locale, "admin");
  const query = await searchParams;
  const [t, db] = await Promise.all([getTranslations({ locale, namespace: "content.lessons" }), createClient()]);
  const [lessons, levels] = await Promise.all([listAdminLessons(db), listLevels(db)]);
  // /lessons/new?category=kids&level=A1 abre el modal con esa categoría y nivel ya elegidos.
  const category = categories.find((value) => value === query.category) ?? "foundations";
  const levelId = levels.find((level) => level.code === query.level || level.id === query.level)?.id;
  return <><PageHeader title={t("title")} intro={t("intro")} action={<ModalButton label={t("new")} size="lg" defaultOpen={query.new === "1"}><LessonForm locale={locale} levels={levels} defaults={{ category, levelId }} /></ModalButton>} />
    {categories.map((name) => <Section key={name} id={`category-${name}`} title={t(`categoryNames.${name}`)}>
      {name === "foundations" ? <LessonList category={name} level={null} levels={levels} lessons={lessons.filter((row) => row.category === name)} locale={locale} t={t} /> : levels.map((level) => <div key={level.id} className="border-b border-line py-4 last:border-0"><h3 className="font-semibold">{level.code}</h3><LessonList category={name} level={level} levels={levels} lessons={lessons.filter((row) => row.category === name && row.level_id === level.id)} locale={locale} t={t} /></div>)}
    </Section>)}
  </>;
}
function LessonList({ category, level, levels, lessons, locale, t }: { category: string; level: { id: string; code: string } | null; levels: Levels; lessons: Awaited<ReturnType<typeof listAdminLessons>>; locale: string; t: Awaited<ReturnType<typeof getTranslations>> }) {
  const where = t("addAtLevel", { level: level?.code ?? t("categoryNames.foundations") });
  return <div className="mt-2">
    <ModalButton iconOnly label={where} title={where} icon={<Plus className="size-5" strokeWidth={2} />} size="lg"><LessonForm locale={locale} levels={levels} defaults={{ category, levelId: level?.id }} /></ModalButton>
    {!lessons.length ? <p className="mt-2 text-sm text-text-muted">{t("empty")}</p> : <ul className="mt-2 divide-y divide-line">{lessons.map((lesson, index) => <li key={lesson.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span><Link className="font-medium underline" href={`/${locale}/admin/lessons/${lesson.id}`}>{locale === "es" ? lesson.title_es : lesson.title_en}</Link> · {lesson.levelCode ?? "—"} · {t(`kindNames.${lesson.kind}`)}</span>
      <div className="flex flex-wrap items-center gap-0.5"><span className="mr-2"><StatusBadge tone={lesson.status === "published" ? "success" : "muted"}>{t(`statusNames.${lesson.status}`)}</StatusBadge></span>
        <MoveButtons id={lesson.id} action={moveLesson} first={index === 0} last={index === lessons.length - 1} labelUp={t("moveUp", { title: lesson.title_es })} labelDown={t("moveDown", { title: lesson.title_es })} locale={locale} />
        <PublishToggle id={lesson.id} locale={locale} published={lesson.status === "published"} />
        <IconLink href={`/${locale}/admin/lessons/${lesson.id}`} label={t("edit")} icon={<Pencil className="size-5" strokeWidth={1.75} />} />
        {lesson.kind === "article" ? <DeleteLessonButton id={lesson.id} locale={locale} className="" /> : null}
      </div></li>)}</ul>}
  </div>;
}
