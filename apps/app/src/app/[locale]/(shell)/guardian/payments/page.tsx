import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState, HeroHeader, ListSection, PageContainer } from "@/components/layout/page-parts";
import { isLocale } from "@/i18n/routing";
import { balanceCents, paidCents } from "@/lib/enrollments/status";
import { formatAud } from "@/lib/money";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatInstant } from "@/lib/time";

/** Pagos (tutor): lo pagado por cada hijo y el saldo pendiente de sus matrículas (RLS: solo los suyos). */
export default async function GuardianPaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "guardian");
  const t = await getTranslations({ locale, namespace: "guardian.payments" });
  const tm = await getTranslations({ locale, namespace: "studentEnrolment.method" });
  const supabase = await createClient();
  const [payments, enrollments] = await Promise.all([
    supabase.from("enrollment_payments").select("id, method, amount_cents, refunded_cents, paid_at, reference, students(full_name), enrollments(groups(name))").order("paid_at", { ascending: false }),
    supabase.from("enrollments").select("id, agreed_amount_cents, students(full_name), groups(name), enrollment_payments(amount_cents, refunded_cents)").neq("status", "cancelled"),
  ]);
  if (payments.error) throw new Error(`enrollment_payments: ${payments.error.code}`);
  if (enrollments.error) throw new Error(`enrollments: ${enrollments.error.code}`);
  const due = enrollments.data
    .map((e) => ({ id: e.id, child: e.students?.full_name ?? "—", group: e.groups?.name ?? "—", balance: balanceCents(e.agreed_amount_cents, paidCents(e.enrollment_payments)) }))
    .filter((e) => e.balance > 0);

  return (
    <PageContainer>
      <HeroHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      {due.length > 0 ? (
        <section aria-labelledby="guardian-due" className="mt-8 rounded-[var(--shape-lg)] border border-line border-l-4 border-l-danger bg-surface p-5">
          <h2 id="guardian-due" className="text-lg font-bold text-text">
            {t("dueTitle")}
          </h2>
          <ul className="mt-2 list-none space-y-1 p-0">
            {due.map((d) => (
              <li key={d.id} className="flex justify-between gap-4">
                <span>
                  {d.child} · {d.group}
                </span>
                <span className="font-bold text-danger">{formatAud(d.balance)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-text-muted">{t("dueHint")}</p>
        </section>
      ) : null}
      <ListSection id="guardian-history" title={t("history")}>
        {payments.data.length === 0 ? (
          <EmptyState className="mt-3">{t("empty")}</EmptyState>
        ) : (
          <ul className="mt-3 list-none divide-y divide-line rounded-[var(--shape-lg)] border border-line bg-surface p-0">
            {payments.data.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-semibold text-text">
                    {p.students?.full_name ?? "—"} · {p.enrollments?.groups?.name ?? "—"}
                  </p>
                  <p className="text-sm text-text-muted">
                    {formatInstant(p.paid_at, locale)} · {tm(p.method)}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </p>
                </div>
                <p className="text-right">
                  <span className="text-lg font-bold text-text">{formatAud(p.amount_cents)}</span>
                  {p.refunded_cents > 0 ? <span className="block text-sm text-text-muted">{t("refunded", { amount: formatAud(p.refunded_cents) })}</span> : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ListSection>
    </PageContainer>
  );
}
