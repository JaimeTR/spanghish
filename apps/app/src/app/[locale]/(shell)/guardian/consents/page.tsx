import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StatusBadge } from "@/components/admin/PageHeader";
import { ConsentToggle } from "@/components/guardian/ConsentToggle";
import { EmptyState, HeroHeader, PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatInstant, schoolToday } from "@/lib/time";

const KINDS = ["minor_data", "recordings", "photos"] as const;
const EDITABLE = ["recordings", "photos"] as const;

/**
 * Consentimientos (tutor): por hijo, el estado actual de cada tipo (el último registro manda), con
 * el texto vigente. Grabaciones y fotos se pueden dar o retirar aquí; el de datos del menor lo gestiona la escuela.
 */
export default async function GuardianConsentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "guardian");
  const t = await getTranslations({ locale, namespace: "guardian.consents" });
  const supabase = await createClient();
  const es = locale === "es";
  const [children, consents, texts] = await Promise.all([
    supabase.from("students").select("id, full_name").order("full_name"),
    supabase.from("consents").select("student_id, kind, granted, recorded_at").order("recorded_at", { ascending: false }).limit(1000),
    supabase.from("consent_texts").select("id, kind, body_es, body_en, effective_from, created_at").order("effective_from", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  for (const res of [children, consents, texts]) if (res.error) throw new Error(`consents: ${res.error.code}`);
  const today = schoolToday();
  const currentText = (kind: string) => texts.data!.find((x) => x.kind === kind && x.effective_from <= today);

  return (
    <PageContainer>
      <HeroHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      {children.data!.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <div className="mt-8 space-y-8">
          {children.data!.map((c) => (
            <section key={c.id} aria-labelledby={`consents-${c.id}`}>
              <h2 id={`consents-${c.id}`} className="text-xl font-bold text-text">
                {c.full_name}
              </h2>
              <ul className="mt-3 list-none space-y-3 p-0">
                {KINDS.map((kind) => {
                  const latest = consents.data!.find((x) => x.student_id === c.id && x.kind === kind);
                  const text = currentText(kind);
                  const editable = (EDITABLE as readonly string[]).includes(kind);
                  return (
                    <li key={kind} className="rounded-[var(--shape-lg)] border border-line bg-surface p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-bold text-text">{t(`kind.${kind}`)}</h3>
                        <StatusBadge tone={latest ? (latest.granted ? "success" : "muted") : "warning"}>{latest ? (latest.granted ? t("granted") : t("withdrawn")) : t("none")}</StatusBadge>
                      </div>
                      {latest ? <p className="text-sm text-text-muted">{t("since", { date: formatInstant(latest.recorded_at, locale) })}</p> : null}
                      {text ? <p className="mt-2 rounded-md bg-surface-sunken p-3 text-sm whitespace-pre-line text-text">{es ? text.body_es : text.body_en}</p> : null}
                      {editable ? (
                        text ? (
                          <ConsentToggle locale={locale} studentId={c.id} kind={kind as (typeof EDITABLE)[number]} granted={latest?.granted ?? false} />
                        ) : (
                          <p className="mt-2 text-sm text-text-muted">{t("noText")}</p>
                        )
                      ) : (
                        <p className="mt-2 text-sm text-text-muted">{t("managedBySchool")}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
