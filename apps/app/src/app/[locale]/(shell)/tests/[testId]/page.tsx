import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { getTestInfo } from "@/lib/data/tests";
import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatInstant } from "@/lib/time";
import { TestRunner } from "./TestRunner";

/** Hacer un test: abierto a cualquier cuenta a la que se le haya compartido (o por enlace). */
export default async function TakeTestPage({ params }: { params: Promise<{ locale: string; testId: string }> }) {
  const { locale, testId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const user = await getSessionUser();
  if (!user) notFound();
  const t = await getTranslations({ locale, namespace: "tests.run" });
  const info = await getTestInfo(await createClient(), testId);
  if (!info) notFound();

  const es = locale === "es";
  const title = es ? info.title_es : info.title_en;
  const description = es ? info.description_es : info.description_en;
  const done = info.attempts.length;
  const canStart = info.max_attempts === null || done < info.max_attempts;
  const backHref = user.roles.includes("student")
    ? `/${locale}/student/tests`
    : user.roles.includes("admin")
      ? `/${locale}/admin/tests`
      : `/${locale}/account`;

  const facts = [
    t("factQuestions", { count: info.question_count }),
    info.time_limit_minutes ? t("factTime", { minutes: info.time_limit_minutes }) : t("factNoTime"),
    t("factPass", { percent: info.pass_percent }),
    info.max_attempts ? t("factAttempts", { done, max: info.max_attempts }) : t("factUnlimited"),
  ];

  return (
    <section aria-labelledby="take-title" className="max-w-3xl">
      <a href={backHref} className="text-sm font-semibold text-primary underline underline-offset-2">
        {t("back")}
      </a>
      <h1 id="take-title" className="mt-2 text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-text">
        {title}
        {info.level_code ? <span className="ml-3 rounded-full bg-highlight px-3 py-0.5 align-middle text-sm font-bold text-on-highlight">{info.level_code}</span> : null}
      </h1>
      {description ? <p className="mt-2 max-w-[65ch] text-text-muted">{description}</p> : null}
      <ul className="mt-4 flex flex-wrap gap-2">
        {facts.map((f) => (
          <li key={f} className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-text">
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <TestRunner testId={info.id} locale={locale} title={title} canStart={canStart} backHref={backHref} />
      </div>

      {done > 0 ? (
        <section aria-labelledby="take-history" className="mt-10">
          <h2 id="take-history" className="mb-3 text-lg font-bold text-text">
            {t("history")}
          </h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {info.attempts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="text-text">{formatInstant(a.submitted_at, locale)}</span>
                <span className="font-semibold text-text">
                  {a.grade.toFixed(1)} / {info.grade_scale} · {a.percent}% ·{" "}
                  <span className={a.passed ? "text-success" : "text-danger"}>{a.passed ? t("passed") : t("failed")}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
