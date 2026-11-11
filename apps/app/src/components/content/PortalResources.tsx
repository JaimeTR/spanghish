import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ResourceCard } from "@/components/content/ResourceCard";
import { HeroHeader, PageContainer } from "@/components/layout/page-parts";
import type { Locale } from "@/i18n/routing";
import { listPortalResources } from "@/lib/data/content";
import { listAvailableTests } from "@/lib/data/tests";
import { createClient } from "@/lib/supabase/server";

const TIERS = ["public", "account", "enrolled"] as const;

/**
 * Recursos del portal por nivel de acceso (público, con cuenta, para matriculados), con los tests
 * marcados como recurso. Compartido por el alumno y la docente: lo que ve cada una lo decide la
 * base de datos (content_tier y RLS). `showTests`: solo el alumno hace los tests.
 */
export async function PortalResources({ locale, showTests = true }: { locale: Locale; showTests?: boolean }) {
  const supabase = await createClient();
  const [t, tt] = await Promise.all([getTranslations({ locale, namespace: "studentContent.resources" }), getTranslations({ locale, namespace: "tests.student" })]);
  const [{ data: tier, error: tierError }, resources, allTests] = await Promise.all([
    supabase.rpc("content_tier"),
    listPortalResources(supabase),
    showTests ? listAvailableTests(supabase) : Promise.resolve([]),
  ]);
  if (tierError) throw new Error(`content_tier: ${tierError.code}`);
  const tests = allTests.filter((test) => test.in_resources);
  const tierNames = { public: t("accessTiers.public"), account: t("accessTiers.account"), enrolled: t("accessTiers.enrolled") };

  return (
    <PageContainer size="lg">
      <HeroHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("yourAccess", { tier: tierNames[tier ?? "public"] })} />
      <div className="mt-8 space-y-10">
        {tests.length ? (
          <section aria-labelledby="resources-tests">
            <h2 id="resources-tests" className="mb-4 text-2xl font-extrabold text-structure">
              {tt("resourcesTitle")}
            </h2>
            <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {tests.map((test) => (
                <li key={test.id} className="rounded-[var(--shape-lg)] border border-line border-t-4 border-t-brand-yellow bg-surface p-5 shadow-sm">
                  <h3 className="text-lg font-bold">{locale === "es" ? test.title_es : test.title_en}</h3>
                  <p className="mt-1 text-sm text-text-muted">
                    {tt("meta", { count: test.question_count })}
                    {test.level_code ? ` · ${test.level_code}` : ""}
                  </p>
                  <Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-structure underline focus-visible:outline-[var(--focus-ring)]" href={`/${locale}/tests/${test.id}`}>
                    {test.attempts > 0 ? tt("again") : tt("start")}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {TIERS.map((level) => {
          const rows = resources.filter((item) => item.accessLevel === level);
          return (
            <section key={level} aria-labelledby={`resources-${level}`}>
              <h2 id={`resources-${level}`} className="mb-4 text-2xl font-extrabold text-structure">
                {t(`tiers.${level}`)}
              </h2>
              {rows.length ? (
                <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((resource) => (
                    <li key={resource.id}>
                      <ResourceCard resource={resource} locale={locale} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl bg-surface-sunken p-4 text-text-muted">{t("empty")}</p>
              )}
            </section>
          );
        })}
      </div>
    </PageContainer>
  );
}
