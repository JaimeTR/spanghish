import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LEARN_CATEGORY_KEYS } from "@spanglish/content";
import { DataTable, type DataColumn, type DataRow } from "@/components/admin/DataTable";
import { PageHeader, RowActions, StatusBadge } from "@/components/admin/PageHeader";
import { CoverThumb } from "@/components/content/Cover";
import { MoveButtons } from "@/components/content/MoveButtons";
import { linkClass } from "@/components/form-styles";
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

export default async function LessonsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; level?: string; new?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const query = await searchParams;
  const [t, db] = await Promise.all([getTranslations({ locale, namespace: "content.lessons" }), createClient()]);
  const [lessons, levels] = await Promise.all([listAdminLessons(db), listLevels(db)]);
  // /lessons?new=1&category=kids&level=A1 abre el modal con esa categoría y nivel ya elegidos.
  const category = LEARN_CATEGORY_KEYS.find((value) => value === query.category) ?? "foundations";
  const levelId = levels.find((level) => level.code === query.level || level.id === query.level)?.id;
  const titleOf = (l: (typeof lessons)[number]) => (locale === "es" ? l.title_es : l.title_en);
  const href = (id: string) => `/${locale}/admin/lessons/${id}`;

  // Subir/bajar mueve la lección dentro de su categoría y nivel (el orden que ve el alumnado).
  const group = (l: (typeof lessons)[number]) => lessons.filter((x) => x.category === l.category && x.level_id === l.level_id);

  const columns: DataColumn[] = [
    { id: "title", header: t("columns.lesson"), sortable: true, rowHeader: true },
    {
      id: "category",
      header: t("category"),
      sortable: true,
      filter: { options: LEARN_CATEGORY_KEYS.map((c) => ({ value: c, label: t(`categoryNames.${c}`) })) },
    },
    {
      id: "level",
      header: t("level"),
      sortable: true,
      filter: { options: [...levels.map((l) => ({ value: l.code, label: l.code })), { value: "none", label: t("noLevel") }] },
    },
    {
      id: "kind",
      header: t("kind"),
      filter: { options: (["article", "interactive"] as const).map((k) => ({ value: k, label: t(`kindNames.${k}`) })) },
    },
    { id: "blocks", header: t("blocks"), sortable: true },
    {
      id: "status",
      header: t("columns.status"),
      sortable: true,
      filter: { options: (["draft", "published"] as const).map((s) => ({ value: s, label: t(`statusNames.${s}`) })) },
    },
    { id: "actions", header: t("columns.actions"), align: "right" },
  ];

  const rows: DataRow[] = lessons.map((lesson) => {
    const siblings = group(lesson);
    const index = siblings.findIndex((x) => x.id === lesson.id);
    const badge = (
      <StatusBadge tone={lesson.status === "published" ? "success" : "muted"}>{t(`statusNames.${lesson.status}`)}</StatusBadge>
    );
    const actions = (
      <RowActions>
        <MoveButtons
          id={lesson.id}
          action={moveLesson}
          first={index === 0}
          last={index === siblings.length - 1}
          labelUp={t("moveUp", { title: titleOf(lesson) })}
          labelDown={t("moveDown", { title: titleOf(lesson) })}
          locale={locale}
        />
        <PublishToggle id={lesson.id} locale={locale} published={lesson.status === "published"} />
        <IconLink href={href(lesson.id)} label={t("edit")} icon={<Pencil className="size-5" strokeWidth={1.75} />} />
        {lesson.kind === "article" ? <DeleteLessonButton id={lesson.id} locale={locale} className="" /> : null}
      </RowActions>
    );
    const summary = locale === "es" ? lesson.summary_es : lesson.summary_en;
    return {
      id: lesson.id,
      values: {
        title: titleOf(lesson),
        category: lesson.category,
        level: lesson.levelCode ?? "none",
        kind: lesson.kind,
        blocks: String(lesson.blockCount).padStart(3, "0"),
        status: lesson.status,
      },
      searchText: `${lesson.title_es} ${lesson.title_en} ${lesson.slug} ${lesson.levelCode ?? ""}`,
      cells: {
        title: (
          <span className="flex items-center gap-3">
            <CoverThumb path={lesson.cover_path} size={44} />
            <span className="min-w-0">
              <Link href={href(lesson.id)} className={linkClass}>
                {titleOf(lesson)}
              </Link>
              {summary ? <span className="block max-w-72 truncate text-xs font-normal text-text-muted">{summary}</span> : null}
            </span>
          </span>
        ),
        category: t(`categoryNames.${lesson.category}`),
        level: lesson.levelCode ?? "—",
        kind: t(`kindNames.${lesson.kind}`),
        blocks: lesson.kind === "article" ? lesson.blockCount : "—",
        status: badge,
        actions,
      },
      card: (
        <>
          <div className="flex items-start gap-3">
            <CoverThumb path={lesson.cover_path} size={56} />
            <div className="min-w-0 flex-1">
              <Link href={href(lesson.id)} className={`${linkClass} inline-flex min-h-11 items-center`}>
                {titleOf(lesson)}
              </Link>
              <p className="text-sm text-text-muted">
                {t(`categoryNames.${lesson.category}`)} · {lesson.levelCode ?? "—"} · {t(`kindNames.${lesson.kind}`)}
              </p>
            </div>
            {badge}
          </div>
          <div className="mt-2 border-t border-line pt-2">{actions}</div>
        </>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title={t("pageTitle")}
        intro={t("intro")}
        action={
          <ModalButton label={t("new")} title={t("new")} size="lg" defaultOpen={query.new === "1"}>
            <LessonForm locale={locale} levels={levels} defaults={{ category, levelId }} />
          </ModalButton>
        }
      />
      {lessons.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("empty")}</p>
      ) : (
        <DataTable caption={t("pageTitle")} columns={columns} rows={rows} searchLabel={t("search")} defaultSort={{ id: "category" }} />
      )}
    </>
  );
}
