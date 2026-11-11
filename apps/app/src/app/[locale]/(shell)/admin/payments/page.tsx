import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type DataColumn, type DataRow } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { formatAud } from "@/lib/money";
import { paymentStatus, stripePaymentUrl, summarizePayments } from "@/lib/shop/payments";
import { StatusBadge } from "@/components/admin/PageHeader";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatInstant } from "@/lib/time";

/** Pagos (solo lectura): cobros de matrículas (tarjeta y manuales) y de la tienda, con reembolsos y enlace a Stripe. */
export default async function AdminPaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "adminPayments" });
  const { data, error } = await (await createClient())
    .from("shop_orders")
    .select("id, email, total_cents, refunded_cents, refunded_at, currency, created_at, stripe_session_id, payment_intent_id, shop_order_items(name)")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`shop_orders: ${error.code}`);

  // Pagos de matrículas: Stripe (los registra el servidor) y manuales (se registran en Matrículas).
  const enrol = await (await createClient())
    .from("enrollment_payments")
    .select("id, method, amount_cents, refunded_cents, currency, reference, note, paid_at, stripe_session_id, payment_intent_id, student_id, students(full_name), enrollments(groups(name))")
    .order("paid_at", { ascending: false })
    .limit(1000);
  if (enrol.error) throw new Error(`enrollment_payments: ${enrol.error.code}`);
  const enrolSum = summarizePayments(enrol.data.map((p) => ({ total_cents: p.amount_cents, refunded_cents: p.refunded_cents })));
  const enrolTiles = [
    { label: t("summary.collected"), value: formatAud(enrolSum.collectedCents) },
    { label: t("summary.refunded"), value: formatAud(enrolSum.refundedCents) },
    { label: t("summary.net"), value: formatAud(enrolSum.netCents) },
    { label: t("enrollments.count"), value: String(enrolSum.count) },
  ];
  const enrolColumns: DataColumn[] = [
    { id: "date", header: t("columns.date"), sortable: true, rowHeader: true },
    { id: "student", header: t("enrollments.student"), sortable: true },
    { id: "group", header: t("enrollments.group"), sortable: true },
    { id: "method", header: t("enrollments.method"), filter: { options: (["stripe", "transfer", "cash", "eventbrite", "other"] as const).map((m) => ({ value: m, label: t(`enrollments.methods.${m}`) })) } },
    { id: "amount", header: t("columns.amount"), sortable: true },
    { id: "status", header: t("columns.status"), sortable: true },
    { id: "reference", header: t("enrollments.reference") },
  ];
  const enrolRows: DataRow[] = enrol.data.map((p) => {
    const student = p.students?.full_name ?? "—";
    const group = p.enrollments?.groups?.name ?? "—";
    const status = paymentStatus({ total_cents: p.amount_cents, refunded_cents: p.refunded_cents });
    const url = p.stripe_session_id ? stripePaymentUrl(p.payment_intent_id, p.stripe_session_id) : null;
    const amount = `${formatAud(p.amount_cents)} ${p.currency.toUpperCase()}`;
    const badge = (
      <StatusBadge tone={status === "paid" ? "success" : "muted"}>
        {t(`status.${status}`)}
        {p.refunded_cents > 0 ? ` · ${t("refundedOf", { amount: formatAud(p.refunded_cents) })}` : ""}
      </StatusBadge>
    );
    const reference = url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        {t("openInStripe")}
      </a>
    ) : (
      <span className="block max-w-56 truncate">{[p.reference, p.note].filter(Boolean).join(" · ") || "—"}</span>
    );
    const studentLink = (
      <a href={`/${locale}/admin/students/${p.student_id}`} className="font-semibold text-structure underline underline-offset-2">
        {student}
      </a>
    );
    return {
      id: p.id,
      values: { date: p.paid_at, student, group, method: p.method, amount: String(p.amount_cents).padStart(9, "0"), status, reference: p.reference ?? "" },
      searchText: `${student} ${group} ${p.reference ?? ""} ${p.note ?? ""}`,
      cells: { date: formatInstant(p.paid_at, locale), student: studentLink, group, method: t(`enrollments.methods.${p.method}`), amount, status: badge, reference },
      card: (
        <>
          <p className="font-semibold text-text">{student}</p>
          <p className="text-sm text-text-muted">
            {formatInstant(p.paid_at, locale)} · {amount} · {t(`enrollments.methods.${p.method}`)}
          </p>
          <p className="mt-1 text-sm text-text">{group}</p>
          <p className="mt-1 text-sm">{badge}</p>
        </>
      ),
    };
  });

  const sum = summarizePayments(data);
  const tiles = [
    { label: t("summary.collected"), value: formatAud(sum.collectedCents) },
    { label: t("summary.refunded"), value: formatAud(sum.refundedCents) },
    { label: t("summary.net"), value: formatAud(sum.netCents) },
    { label: t("summary.count"), value: String(sum.count) },
  ];

  const columns: DataColumn[] = [
    { id: "date", header: t("columns.date"), sortable: true, rowHeader: true },
    { id: "email", header: t("columns.email"), sortable: true },
    { id: "items", header: t("columns.items") },
    { id: "amount", header: t("columns.amount"), sortable: true },
    { id: "status", header: t("columns.status"), sortable: true },
    { id: "stripe", header: t("columns.stripe") },
  ];

  const rows: DataRow[] = data.map((o) => {
    const items = o.shop_order_items.map((i) => i.name).join(", ");
    const status = paymentStatus(o);
    const statusLabel = t(`status.${status}`);
    const amount = `${formatAud(o.total_cents)} ${o.currency.toUpperCase()}`;
    const refund = o.refunded_cents > 0 ? t("refundedOf", { amount: formatAud(o.refunded_cents) }) : null;
    const url = stripePaymentUrl(o.payment_intent_id, o.stripe_session_id);
    const link = url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        {t("openInStripe")}
      </a>
    ) : (
      <span className="text-text-muted">—</span>
    );
    const badge = (
      <span className={status === "paid" ? "font-medium text-text" : "font-medium text-text-muted"}>
        {statusLabel}
        {refund ? ` · ${refund}` : ""}
      </span>
    );
    return {
      id: o.id,
      values: {
        date: o.created_at,
        email: o.email ?? "",
        items,
        amount: String(o.total_cents).padStart(9, "0"),
        status,
        stripe: "",
      },
      searchText: `${o.email ?? ""} ${items} ${statusLabel}`,
      cells: {
        date: formatInstant(o.created_at, locale),
        email: o.email ?? "—",
        items: <span className="block max-w-80">{items}</span>,
        amount,
        status: badge,
        stripe: link,
      },
      card: (
        <>
          <p className="font-semibold text-text">{o.email ?? "—"}</p>
          <p className="text-sm text-text-muted">
            {formatInstant(o.created_at, locale)} · {amount}
          </p>
          <p className="mt-1 text-sm text-text">{items}</p>
          <p className="mt-1 text-sm">{badge}</p>
          <p className="mt-1 text-sm">{link}</p>
        </>
      ),
    };
  });

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <h2 className="mt-8 text-lg font-bold text-text">{t("enrollments.title")}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {enrolTiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-line p-4">
            <dt className="text-sm text-text-muted">{tile.label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-text">{tile.value}</dd>
          </div>
        ))}
      </dl>
      {enrol.data.length === 0 ? (
        <p className="mt-4 text-text-muted">{t("enrollments.empty")}</p>
      ) : (
        <DataTable caption={t("enrollments.title")} columns={enrolColumns} rows={enrolRows} searchLabel={t("enrollments.search")} defaultSort={{ id: "date", dir: "desc" }} />
      )}
      <h2 className="mt-10 text-lg font-bold text-text">{t("shopTitle")}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-line p-4">
            <dt className="text-sm text-text-muted">{tile.label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-text">{tile.value}</dd>
          </div>
        ))}
      </dl>
      {data.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("empty")}</p>
      ) : (
        <DataTable caption={t("title")} columns={columns} rows={rows} searchLabel={t("search")} defaultSort={{ id: "date", dir: "desc" }} />
      )}
    </>
  );
}
