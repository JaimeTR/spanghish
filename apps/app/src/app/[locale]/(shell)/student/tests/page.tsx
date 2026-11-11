import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { listAvailableTests, listMyResults } from "@/lib/data/tests";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatInstant } from "@/lib/time";

export default async function StudentTestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "student");
  const t = await getTranslations({ locale, namespace: "tests.student" });
  const db = await createClient();
  const [tests, results] = await Promise.all([listAvailableTests(db), listMyResults(db)]);
  const es = locale === "es";

  return (
    <div className="max-w-5xl">
      <header>
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-text">{t("title")}</h1>
        <p className="mt-1.5 max-w-[65ch] text-text-muted">{t("intro")}</p>
      </header>

      <section aria-labelledby="tests-available" className="mt-8">
        <h2 id="tests-available" className="mb-4 text-xl font-bold text-structure">
          {t("available")}
        </h2>
        {tests.length === 0 ? (
          <p className="rounded-lg bg-surface-sunken p-4 text-text-muted">{t("empty")}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tests.map((test) => {
              const title = es ? test.title_es : test.title_en;
              const description = es ? test.description_es : test.description_en;
              const exhausted = test.max_attempts !== null && test.attempts >= test.max_attempts;
              return (
                <li key={test.id} className="flex flex-col rounded-lg border border-line bg-surface p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-text">{title}</h3>
                    {test.level_code ? (
                      <span className="shrink-0 rounded-full bg-highlight px-2.5 py-0.5 text-xs font-bold text-on-highlight">{test.level_code}</span>
                    ) : null}
                  </div>
                  {description ? <p className="mt-2 text-sm text-text-muted">{description}</p> : null}
                  <p className="mt-3 text-sm text-text">
                    {t("meta", { count: test.question_count })}
                    {test.time_limit_minutes ? ` · ${t("minutes", { minutes: test.time_limit_minutes })}` : ""}
                  </p>
                  {test.attempts > 0 ? (
                    <p className="mt-1 text-sm font-semibold text-text">
                      {t("best", { grade: Number(test.best_grade).toFixed(1), scale: test.grade_scale })} ·{" "}
                      <span className={test.passed ? "text-success" : "text-danger"}>{test.passed ? t("passed") : t("notPassed")}</span>
                    </p>
                  ) : null}
                  <div className="mt-auto pt-4">
                    {exhausted ? (
                      <span className="text-sm font-semibold text-text-muted">{t("exhausted")}</span>
                    ) : (
                      <Link
                        href={`/${locale}/tests/${test.id}`}
                        className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-on-primary hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
                      >
                        {test.attempts > 0 ? t("again") : t("start")}
                        <span className="sr-only">: {title}</span>
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="tests-grades" className="mt-10">
        <h2 id="tests-grades" className="mb-4 text-xl font-bold text-structure">
          {t("grades")}
        </h2>
        {results.length === 0 ? (
          <p className="rounded-lg bg-surface-sunken p-4 text-text-muted">{t("noGrades")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">{t("grades")}</caption>
              <thead>
                <tr className="bg-surface-sunken/70 text-xs font-bold tracking-wide text-text-muted uppercase">
                  <th scope="col" className="px-4 py-3">{t("test")}</th>
                  <th scope="col" className="px-4 py-3">{t("grade")}</th>
                  <th scope="col" className="px-4 py-3">{t("percent")}</th>
                  <th scope="col" className="px-4 py-3">{t("result")}</th>
                  <th scope="col" className="px-4 py-3">{t("date")}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.attempt_id} className="border-t border-line">
                    <th scope="row" className="px-4 py-3 text-left font-semibold text-text">
                      {es ? r.title_es : r.title_en}
                      {r.level_code ? <span className="ml-2 text-xs text-text-muted">{r.level_code}</span> : null}
                    </th>
                    <td className="px-4 py-3 text-text">
                      {Number(r.grade).toFixed(1)} / {r.grade_scale}
                    </td>
                    <td className="px-4 py-3 text-text">{r.percent}%</td>
                    <td className={`px-4 py-3 font-semibold ${r.passed ? "text-success" : "text-danger"}`}>{r.passed ? t("passed") : t("notPassed")}</td>
                    <td className="px-4 py-3 text-text">{formatInstant(r.submitted_at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
