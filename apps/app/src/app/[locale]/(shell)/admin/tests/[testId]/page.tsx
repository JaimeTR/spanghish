import { CircleHelp, ListChecks, Pencil, Type } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type DataColumn, type DataRow } from "@/components/admin/DataTable";
import { PageHeader, Section, StatusBadge } from "@/components/admin/PageHeader";
import { MoveButtons } from "@/components/content/MoveButtons";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { listLevels } from "@/lib/data/content";
import { getAdminTest, listShareablePeople } from "@/lib/data/tests";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatInstant } from "@/lib/time";
import { moveQuestion } from "../actions";
import { TestDelete, QuestionDelete, TestPublishButton } from "../TestButtons";
import { TestForm } from "../TestForm";
import { QuestionForm } from "./QuestionForm";
import { ShareForm } from "./ShareForm";

export default async function TestDetailPage({ params }: { params: Promise<{ locale: string; testId: string }> }) {
  const { locale, testId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const db = await createClient();
  const [detail, levels, t] = await Promise.all([
    getAdminTest(db, testId),
    listLevels(db),
    getTranslations({ locale, namespace: "tests" }),
  ]);
  if (!detail) notFound();
  const { test, questions, sharedWith, attempts } = detail;
  const people = test.visibility === "private" ? await listShareablePeople(db) : [];
  const es = locale === "es";
  const published = test.status === "published";

  const kindIcon = { single: CircleHelp, truefalse: ListChecks, fill: Type } as const;
  const passedCount = attempts.filter((a) => a.passed).length;
  const average = attempts.length ? attempts.reduce((sum, a) => sum + a.grade, 0) / attempts.length : 0;

  const columns: DataColumn[] = [
    { id: "person", header: t("results.person"), sortable: true, rowHeader: true },
    { id: "grade", header: t("results.grade"), sortable: true },
    { id: "percent", header: t("results.percent"), sortable: true },
    {
      id: "result",
      header: t("results.result"),
      filter: {
        options: [
          { value: "passed", label: t("results.passed") },
          { value: "failed", label: t("results.failed") },
        ],
      },
    },
    { id: "date", header: t("results.date"), sortable: true },
  ];
  const rows: DataRow[] = attempts.map((a) => {
    const badge = <StatusBadge tone={a.passed ? "success" : "warning"}>{a.passed ? t("results.passed") : t("results.failed")}</StatusBadge>;
    return {
      id: a.id,
      values: {
        person: a.name,
        grade: a.grade.toFixed(1).padStart(5, "0"),
        percent: String(a.percent).padStart(3, "0"),
        result: a.passed ? "passed" : "failed",
        date: a.submittedAt,
      },
      searchText: `${a.name} ${a.email ?? ""}`,
      cells: {
        person: (
          <span>
            {a.name}
            {a.email && a.email !== a.name ? <span className="block text-xs font-normal text-text-muted">{a.email}</span> : null}
          </span>
        ),
        grade: `${a.grade.toFixed(1)} / ${test.grade_scale}`,
        percent: `${a.percent}%`,
        result: badge,
        date: formatInstant(a.submittedAt, locale),
      },
      card: (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-text">{a.name}</p>
              <p className="text-sm text-text-muted">
                {a.grade.toFixed(1)} / {test.grade_scale} · {a.percent}% · {formatInstant(a.submittedAt, locale)}
              </p>
            </div>
            {badge}
          </div>
        </>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title={es ? test.title_es : test.title_en}
        intro={`${test.slug} · ${t(`visibility.${test.visibility as "private" | "portal" | "link"}.name`)} · ${t(published ? "status.published" : "status.draft")}`}
        back={{ href: `/${locale}/admin/tests`, label: t("back") }}
        action={<TestPublishButton id={test.id} locale={locale} published={published} />}
      />

      <Section id="test-questions" title={`${t("questions.title")} (${questions.length})`}
        action={
          <ModalButton label={t("question.add")} title={t("question.add")} size="lg">
            <QuestionForm locale={locale} testId={test.id} />
          </ModalButton>
        }
      >
        {questions.length === 0 ? (
          <p className="text-text-muted">{t("questions.empty")}</p>
        ) : (
          <ol className="space-y-3">
            {questions.map((q, index) => {
              const Icon = kindIcon[q.kind];
              const prompt = es ? q.prompt_es : q.prompt_en;
              return (
                <li key={q.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-structure">
                    <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold tracking-wide text-text-muted uppercase">
                      {t(`question.kinds.${q.kind}`)} · {t("question.pointsShort", { points: q.points })}
                    </p>
                    <p className="truncate text-text">{prompt}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <MoveButtons
                      id={q.id}
                      action={moveQuestion}
                      first={index === 0}
                      last={index === questions.length - 1}
                      labelUp={t("question.up", { title: prompt })}
                      labelDown={t("question.down", { title: prompt })}
                      locale={locale}
                    />
                    <ModalButton iconOnly label={t("question.edit")} title={t("question.edit")} icon={<Pencil className="size-5" strokeWidth={1.75} />} size="lg">
                      <QuestionForm locale={locale} testId={test.id} question={q} />
                    </ModalButton>
                    <QuestionDelete id={q.id} testId={test.id} locale={locale} />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      <Section id="test-settings" title={t("settings")}>
        <TestForm locale={locale} levels={levels} test={test} />
      </Section>

      <Section id="test-share" title={t("share.title")}>
        {test.visibility === "private" ? (
          <>
            <p className="mb-4 text-sm text-text-muted">{t("share.privateHelp")}</p>
            <ShareForm locale={locale} testId={test.id} people={people} selected={sharedWith} />
          </>
        ) : test.visibility === "link" ? (
          <>
            <p className="mb-2 text-sm text-text-muted">{t("share.linkHelp")}</p>
            <input
              readOnly
              aria-label={t("share.link")}
              value={`/${locale}/tests/${test.id}`}
              className="block w-full rounded-md border border-line bg-surface-sunken px-3 py-2 font-mono text-sm text-text"
            />
            <p className="mt-2 text-sm text-text-muted">{t("share.linkNote")}</p>
          </>
        ) : (
          <p className="text-text-muted">{t("share.portalHelp")}</p>
        )}
      </Section>

      <Section id="test-results" title={t("results.title")}>
        {attempts.length === 0 ? (
          <p className="text-text-muted">{t("results.empty")}</p>
        ) : (
          <>
            <dl className="grid gap-4 sm:grid-cols-3">
              {[
                [t("results.attempts"), String(attempts.length)],
                [t("results.average"), `${average.toFixed(1)} / ${test.grade_scale}`],
                [t("results.passRate"), `${Math.round((100 * passedCount) / attempts.length)}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-line p-4">
                  <dt className="text-sm text-text-muted">{label}</dt>
                  <dd className="text-2xl font-bold text-text">{value}</dd>
                </div>
              ))}
            </dl>
            <DataTable caption={t("results.title")} columns={columns} rows={rows} searchLabel={t("results.search")} defaultSort={{ id: "date", dir: "desc" }} />
          </>
        )}
      </Section>

      <div className="mt-8">
        <TestDelete id={test.id} locale={locale} />
      </div>
    </>
  );
}
