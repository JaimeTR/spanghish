import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StatusBadge } from "@/components/admin/PageHeader";
import { EmptyState, HeroHeader, PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { attendanceSummary } from "@/lib/assignments/progress";
import { availableLessons } from "@/lib/credits/balance";
import { balanceCents, paidCents } from "@/lib/enrollments/status";
import { formatAud } from "@/lib/money";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { ageFrom, schoolToday } from "@/lib/time";

const TONES = { pending: "warning", active: "success", paused: "info", completed: "muted", cancelled: "muted" } as const;

/** Mis hijos (tutor): cada hijo con su nivel, matrículas, saldo y asistencia. RLS limita a los suyos. */
export default async function GuardianChildrenPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "guardian");
  const t = await getTranslations({ locale, namespace: "guardian.children" });
  const ts = await getTranslations({ locale, namespace: "studentEnrolment.status" });
  const supabase = await createClient();
  const es = locale === "es";
  const [children, attendance, packs] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, student_private(birth_date), levels(code, name_es, name_en), enrollments(id, status, agreed_amount_cents, groups(name, programs(name_es, name_en)), enrollment_payments(amount_cents, refunded_cents))")
      .order("full_name"),
    supabase.from("attendance").select("student_id, status").limit(2000),
    supabase.from("credit_pack_balances").select("student_id, remaining, voided_at, is_expired"),
  ]);
  if (children.error) throw new Error(`students: ${children.error.code}`);
  if (attendance.error) throw new Error(`attendance: ${attendance.error.code}`);
  if (packs.error) throw new Error(`credit_pack_balances: ${packs.error.code}`);
  const today = schoolToday();

  return (
    <PageContainer size="lg">
      <HeroHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      {children.data.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <ul className="mt-8 grid list-none gap-5 p-0 md:grid-cols-2">
          {children.data.map((c) => {
            const att = attendanceSummary(attendance.data.filter((a) => a.student_id === c.id) as { status: "present" | "late" | "absent" | "excused" }[]);
            const born = c.student_private?.birth_date;
            const childPacks = packs.data.filter((p) => p.student_id === c.id);
            const enrollments = c.enrollments.filter((e) => e.status !== "cancelled");
            return (
              <li key={c.id} className="rounded-[var(--shape-lg)] border border-line border-t-4 border-t-brand-yellow bg-surface p-5">
                <h2 className="text-xl font-bold text-text">{c.full_name}</h2>
                <p className="text-sm text-text-muted">
                  {born ? t("age", { years: ageFrom(born, today) }) : t("noAge")}
                  {c.levels ? ` · ${c.levels.code} ${es ? c.levels.name_es : c.levels.name_en}` : ""}
                </p>
                <h3 className="mt-4 text-sm font-bold text-text-muted uppercase">{t("enrollments")}</h3>
                {enrollments.length === 0 ? (
                  <p className="mt-1 text-sm text-text-muted">{t("noEnrollments")}</p>
                ) : (
                  <ul className="mt-1 list-none space-y-2 p-0">
                    {enrollments.map((e) => {
                      const balance = balanceCents(e.agreed_amount_cents, paidCents(e.enrollment_payments));
                      return (
                        <li key={e.id} className="flex flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block font-semibold text-text">{e.groups?.programs ? (es ? e.groups.programs.name_es : e.groups.programs.name_en) : "—"}</span>
                            <span className="block text-sm text-text-muted">
                              {e.groups?.name ?? "—"} · {balance > 0 ? t("balance", { amount: formatAud(balance) }) : t("paidUp")}
                            </span>
                          </span>
                          <StatusBadge tone={TONES[e.status]}>{ts(e.status)}</StatusBadge>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {childPacks.length > 0 ? (
                  <p className="mt-4 text-sm text-text">
                    <span className="font-semibold">{t("lessonsLeft")}: </span>
                    {availableLessons(childPacks)}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-text">
                  <span className="font-semibold">{t("attendance")}: </span>
                  {att.percent === null ? t("noClasses") : t("attendanceValue", { percent: att.percent, present: att.present, late: att.late, absent: att.absent })}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 flex flex-wrap gap-x-6 gap-y-1">
        {(["schedule", "payments", "consents"] as const).map((key) => (
          <Link key={key} href={`/${locale}/guardian/${key}`} className="inline-flex min-h-11 items-center font-semibold text-structure underline">
            {t(`go.${key}`)}
          </Link>
        ))}
      </p>
    </PageContainer>
  );
}
