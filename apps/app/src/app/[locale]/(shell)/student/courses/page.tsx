import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StatusBadge } from "@/components/admin/PageHeader";
import { EmptyState, HeroHeader, PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { availableLessons } from "@/lib/credits/balance";
import { balanceCents, paidCents } from "@/lib/enrollments/status";
import { formatAud } from "@/lib/money";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/time";

const TONES = { pending: "warning", active: "success", paused: "info", completed: "muted", cancelled: "muted" } as const;

/** Mis cursos: las matrículas de la persona (RLS: solo las suyas), con su grupo, horario, sede y saldo. */
export default async function StudentCoursesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "student");
  const t = await getTranslations({ locale, namespace: "studentEnrolment" });
  const supabase = await createClient();
  const packs = await supabase.from("credit_pack_balances").select("remaining, voided_at, is_expired");
  if (packs.error) throw new Error(`credit_pack_balances: ${packs.error.code}`);
  const { data, error } = await supabase
    .from("enrollments")
    .select(
      "id, status, starts_on, agreed_amount_cents, groups(name, meeting_url, location_note, programs(name_es, name_en, lesson_minutes), program_editions(starts_on, ends_on, schedule_es, schedule_en), locations(name, kind, map_url)), enrollment_payments(amount_cents, refunded_cents)",
    )
    .neq("status", "cancelled")
    .order("starts_on", { ascending: false });
  if (error) throw new Error(`enrollments: ${error.code}`);
  const es = locale === "es";

  return (
    <PageContainer size="lg">
      <HeroHeader eyebrow={t("eyebrow")} title={t("courses.title")} lead={t("courses.lead")} />
      {packs.data.length > 0 ? (
        <p className="mt-6 rounded-[var(--shape-lg)] border border-line border-l-4 border-l-brand-yellow bg-surface p-4 text-text">
          <span className="font-semibold">{t("courses.lessonsLeft")}: </span>
          <span className="text-2xl font-extrabold">{availableLessons(packs.data)}</span>
        </p>
      ) : null}
      {data.length === 0 ? (
        <EmptyState>{t("courses.empty")}</EmptyState>
      ) : (
        <ul className="mt-8 grid list-none gap-4 p-0 md:grid-cols-2">
          {data.map((e) => {
            const g = e.groups;
            const edition = g?.program_editions;
            const schedule = edition ? (es ? edition.schedule_es : edition.schedule_en) : null;
            const balance = balanceCents(e.agreed_amount_cents, paidCents(e.enrollment_payments));
            return (
              <li key={e.id} className="rounded-[var(--shape-lg)] border border-line border-t-4 border-t-brand-yellow bg-surface p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-text">{g?.programs ? (es ? g.programs.name_es : g.programs.name_en) : "—"}</h2>
                    <p className="text-sm text-text-muted">{g?.name}</p>
                  </div>
                  <StatusBadge tone={TONES[e.status]}>{t(`status.${e.status}`)}</StatusBadge>
                </div>
                <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  {edition ? (
                    <>
                      <dt className="font-semibold text-text-muted">{t("courses.dates")}</dt>
                      <dd>
                        {formatDay(edition.starts_on, locale)} – {formatDay(edition.ends_on, locale)}
                      </dd>
                    </>
                  ) : null}
                  {schedule ? (
                    <>
                      <dt className="font-semibold text-text-muted">{t("courses.schedule")}</dt>
                      <dd>{schedule}</dd>
                    </>
                  ) : null}
                  {g?.locations ? (
                    <>
                      <dt className="font-semibold text-text-muted">{t("courses.where")}</dt>
                      <dd>
                        {g.locations.name}
                        {g.location_note ? ` · ${g.location_note}` : ""}
                        {g.locations.map_url ? (
                          <>
                            {" · "}
                            <a href={g.locations.map_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-structure underline">
                              {t("courses.map")}
                            </a>
                          </>
                        ) : null}
                      </dd>
                    </>
                  ) : null}
                  <dt className="font-semibold text-text-muted">{t("courses.balance")}</dt>
                  <dd className={balance > 0 ? "font-bold text-danger" : ""}>{balance > 0 ? formatAud(balance) : t("courses.paidUp")}</dd>
                </dl>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
                  {g?.meeting_url ? (
                    <a href={g.meeting_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-structure underline">
                      {t("courses.join")}
                    </a>
                  ) : null}
                  <Link href={`/${locale}/student/payments`} className="inline-flex min-h-11 items-center font-semibold text-structure underline">
                    {t("courses.seePayments")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
