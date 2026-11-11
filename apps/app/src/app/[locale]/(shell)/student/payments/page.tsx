import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { balanceCents, paidCents } from "@/lib/enrollments/status";
import { formatAud } from "@/lib/money";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatInstant } from "@/lib/time";

/** Mis pagos: lo pagado por cada matrícula y el saldo pendiente (RLS: solo lo propio). */
export default async function StudentPaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "student");
  const t = await getTranslations({ locale, namespace: "studentEnrolment" });
  const supabase = await createClient();
  const [payments, enrollments] = await Promise.all([
    supabase.from("enrollment_payments").select("id, method, amount_cents, refunded_cents, paid_at, reference, enrollments(groups(name))").order("paid_at", { ascending: false }),
    supabase.from("enrollments").select("id, agreed_amount_cents, groups(name), enrollment_payments(amount_cents, refunded_cents)").neq("status", "cancelled"),
  ]);
  if (payments.error) throw new Error(`enrollment_payments: ${payments.error.code}`);
  if (enrollments.error) throw new Error(`enrollments: ${enrollments.error.code}`);
  const due = enrollments.data
    .map((e) => ({ id: e.id, group: e.groups?.name ?? "—", balance: balanceCents(e.agreed_amount_cents, paidCents(e.enrollment_payments)) }))
    .filter((e) => e.balance > 0);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="rounded-[var(--shape-lg)] bg-structure p-6 text-on-structure">
        <p className="text-sm font-semibold">{t("eyebrow")}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{t("payments.title")}</h1>
        <p className="mt-3 text-lg">{t("payments.lead")}</p>
      </header>

      {due.length > 0 ? (
        <section aria-labelledby="payments-due" className="mt-8 rounded-[var(--shape-lg)] border border-line border-l-4 border-l-danger bg-surface p-5">
          <h2 id="payments-due" className="text-lg font-bold text-text">
            {t("payments.dueTitle")}
          </h2>
          <ul className="mt-2 space-y-1">
            {due.map((d) => (
              <li key={d.id} className="flex justify-between gap-4">
                <span>{d.group}</span>
                <span className="font-bold text-danger">{formatAud(d.balance)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-text-muted">{t("payments.dueHint")}</p>
        </section>
      ) : null}

      <section aria-labelledby="payments-list" className="mt-8">
        <h2 id="payments-list" className="mb-4 text-2xl font-extrabold text-structure">
          {t("payments.history")}
        </h2>
        {payments.data.length === 0 ? (
          <p className="rounded-xl bg-surface-sunken p-4 text-text-muted">{t("payments.empty")}</p>
        ) : (
          <ul className="list-none divide-y divide-line rounded-[var(--shape-lg)] border border-line bg-surface p-0">
            {payments.data.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-semibold text-text">{p.enrollments?.groups?.name ?? "—"}</p>
                  <p className="text-sm text-text-muted">
                    {formatInstant(p.paid_at, locale)} · {t(`method.${p.method}`)}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </p>
                </div>
                <p className="text-right">
                  <span className="text-lg font-bold text-text">{formatAud(p.amount_cents)}</span>
                  {p.refunded_cents > 0 ? <span className="block text-sm text-text-muted">{t("payments.refunded", { amount: formatAud(p.refunded_cents) })}</span> : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
