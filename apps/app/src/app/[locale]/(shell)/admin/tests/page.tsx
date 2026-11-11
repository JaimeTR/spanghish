import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type DataColumn, type DataRow } from "@/components/admin/DataTable";
import { PageHeader, RowActions, StatusBadge } from "@/components/admin/PageHeader";
import { linkClass } from "@/components/form-styles";
import { IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { listLevels } from "@/lib/data/content";
import { listAdminTests } from "@/lib/data/tests";
import { requireArea } from "@/lib/require-area";
import { TEST_VISIBILITIES } from "@/lib/schemas/tests";
import { createClient } from "@/lib/supabase/server";
import { TestDelete, TestPublishIcon } from "./TestButtons";
import { TestForm } from "./TestForm";

export default async function TestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const query = await searchParams;
  const db = await createClient();
  const [tests, levels, t] = await Promise.all([
    listAdminTests(db),
    listLevels(db),
    getTranslations({ locale, namespace: "tests" }),
  ]);
  const es = locale === "es";
  const href = (id: string) => `/${locale}/admin/tests/${id}`;

  const columns: DataColumn[] = [
    { id: "title", header: t("columns.test"), sortable: true, rowHeader: true },
    {
      id: "level",
      header: t("form.level"),
      sortable: true,
      filter: { options: [...levels.map((l) => ({ value: l.code, label: l.code })), { value: "none", label: t("form.anyLevel") }] },
    },
    { id: "questions", header: t("columns.questions"), sortable: true },
    {
      id: "visibility",
      header: t("columns.visibility"),
      filter: { options: TEST_VISIBILITIES.map((v) => ({ value: v, label: t(`visibility.${v}.name`) })) },
    },
    { id: "attempts", header: t("columns.attempts"), sortable: true },
    {
      id: "status",
      header: t("columns.status"),
      sortable: true,
      filter: { options: (["draft", "published"] as const).map((s) => ({ value: s, label: t(`status.${s}`) })) },
    },
    { id: "actions", header: t("columns.actions"), align: "right" },
  ];

  const rows: DataRow[] = tests.map((test) => {
    const title = es ? test.title_es : test.title_en;
    const badge = <StatusBadge tone={test.status === "published" ? "success" : "muted"}>{t(`status.${test.status}`)}</StatusBadge>;
    const actions = (
      <RowActions>
        <TestPublishIcon id={test.id} locale={locale} published={test.status === "published"} />
        <IconLink href={href(test.id)} label={t("edit")} icon={<Pencil className="size-5" strokeWidth={1.75} />} />
        <TestDelete id={test.id} locale={locale} />
      </RowActions>
    );
    const visibility = t(`visibility.${test.visibility as (typeof TEST_VISIBILITIES)[number]}.name`);
    return {
      id: test.id,
      values: {
        title,
        level: test.levelCode ?? "none",
        questions: String(test.questionCount).padStart(3, "0"),
        visibility: test.visibility,
        attempts: String(test.attemptCount).padStart(4, "0"),
        status: test.status,
      },
      searchText: `${test.title_es} ${test.title_en} ${test.slug}`,
      cells: {
        title: <Link href={href(test.id)} className={linkClass}>{title}</Link>,
        level: test.levelCode ?? "—",
        questions: test.questionCount,
        visibility,
        attempts: test.attemptCount,
        status: badge,
        actions,
      },
      card: (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={href(test.id)} className={`${linkClass} inline-flex min-h-11 items-center`}>
                {title}
              </Link>
              <p className="text-sm text-text-muted">
                {test.levelCode ?? "—"} · {t("columns.questionsCount", { count: test.questionCount })} · {visibility}
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
        title={t("title")}
        intro={t("intro")}
        action={
          <ModalButton label={t("new")} title={t("new")} size="xl" defaultOpen={query.new === "1"}>
            <TestForm locale={locale} levels={levels} />
          </ModalButton>
        }
      />
      {tests.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("empty")}</p>
      ) : (
        <DataTable caption={t("title")} columns={columns} rows={rows} searchLabel={t("search")} defaultSort={{ id: "title" }} />
      )}
    </>
  );
}
