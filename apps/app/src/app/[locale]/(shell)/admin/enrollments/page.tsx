import { Banknote, CircleCheck, NotebookPen, Pencil, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type DataColumn, type DataRow } from "@/components/admin/DataTable";
import { PageHeader, RowActions, StatusBadge } from "@/components/admin/PageHeader";
import { IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale, type Locale } from "@/i18n/routing";
import { isUuid } from "@/lib/data/catalog";
import { balanceCents, effectiveRequestStatus, paidCents, seatsTaken } from "@/lib/enrollments/status";
import { formatAud } from "@/lib/money";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatInstant } from "@/lib/time";
import { webUrl } from "@/lib/web-url";
import {
  CopyPayLink,
  EnrollmentForm,
  EnrollmentStatusForm,
  PaymentForm,
  RequestCancel,
  RequestConfirmForm,
  RequestNotesForm,
  RequestOffer,
  type EnrollmentOptions,
} from "./forms";

const ENROLLMENT_TONES = { pending: "warning", active: "success", paused: "info", completed: "muted", cancelled: "muted" } as const;
const REQUEST_TONES = { pending_payment: "warning", waitlist: "info", converted: "success", expired: "muted", cancelled: "muted" } as const;
const ENROLLMENT_STATUSES = ["pending", "active", "paused", "completed", "cancelled"] as const;
const REQUEST_STATUSES = ["pending_payment", "waitlist", "converted", "expired", "cancelled"] as const;
type RequestStatus = (typeof REQUEST_STATUSES)[number];

type Search = { tab?: string; group?: string; new?: string };

/** Matrículas y prematrículas (reservas de la web), con sus pagos. `?group=` filtra por grupo. */
export default async function EnrollmentsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const query = await searchParams;
  const tab = query.tab === "requests" ? "requests" : "enrollments";
  const groupId = query.group && isUuid(query.group) ? query.group : undefined;
  const t = await getTranslations({ locale, namespace: "adminEnrollments" });
  const supabase = await createClient();

  const pendingRes = await supabase.from("enrollment_requests").select("id", { count: "exact", head: true }).in("status", ["pending_payment", "waitlist"]);
  const base = `/${locale}/admin/enrollments`;
  const href = (which: "enrollments" | "requests") => `${base}?tab=${which}${groupId ? `&group=${groupId}` : ""}`;
  const tabs = (
    <nav aria-label={t("tabs.label")} className="mt-6 flex gap-1 border-b border-line">
      {(["enrollments", "requests"] as const).map((key) => (
        <Link
          key={key}
          href={href(key)}
          aria-current={tab === key ? "page" : undefined}
          className={`-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-4 font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple ${
            tab === key ? "border-structure text-text" : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          {t(`tabs.${key}`)}
          {key === "requests" && (pendingRes.count ?? 0) > 0 ? <StatusBadge tone="warning">{pendingRes.count}</StatusBadge> : null}
        </Link>
      ))}
    </nav>
  );
  const filterNote = groupId ? (
    <p className="mt-4 text-sm text-text-muted">
      {t("filteredByGroup")}{" "}
      <Link href={`${base}?tab=${tab}`} className="font-semibold text-structure underline">
        {t("clearFilter")}
      </Link>
    </p>
  ) : null;

  return tab === "requests" ? (
    <RequestsTab locale={locale} groupId={groupId} header={<PageHeader title={t("title")} intro={t("intro")} />} tabs={tabs} filterNote={filterNote} />
  ) : (
    <EnrollmentsTab locale={locale} groupId={groupId} openNew={query.new === "1"} tabs={tabs} filterNote={filterNote} />
  );
}

async function EnrollmentsTab({ locale, groupId, openNew, tabs, filterNote }: { locale: Locale; groupId?: string; openNew: boolean; tabs: React.ReactNode; filterNote: React.ReactNode }) {
  const t = await getTranslations({ locale, namespace: "adminEnrollments" });
  const supabase = await createClient();
  const es = locale === "es";

  let enrollmentsQuery = supabase
    .from("enrollments")
    .select("*, students(full_name), groups(name, code), enrollment_payments(amount_cents, refunded_cents)")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (groupId) enrollmentsQuery = enrollmentsQuery.eq("group_id", groupId);
  const [enrollmentsRes, studentsRes, groupsRes, pricesRes] = await Promise.all([
    enrollmentsQuery,
    supabase.from("students").select("id, full_name").eq("status", "active").order("full_name").limit(1000),
    supabase.from("groups").select("id, name, code, capacity, program_id, enrollments(status), enrollment_requests(status, expires_at)").in("status", ["draft", "active"]).order("name").limit(500),
    supabase.from("program_prices").select("id, program_id, kind, amount_cents, lessons_included, label_es, label_en").eq("active", true).limit(1000),
  ]);
  for (const res of [enrollmentsRes, studentsRes, groupsRes, pricesRes]) if (res.error) throw new Error(`enrollments: ${res.error.code}`);
  const enrollments = enrollmentsRes.data ?? [];
  const now = new Date();

  const options: EnrollmentOptions = {
    students: (studentsRes.data ?? []).map((s) => ({ id: s.id, name: s.full_name })),
    groups: (groupsRes.data ?? []).map((g) => ({
      id: g.id,
      programId: g.program_id,
      label: `${g.name} (${g.code}) · ${t("seatsFree", { count: Math.max(0, g.capacity - seatsTaken(g.enrollments, g.enrollment_requests, now)) })}`,
    })),
    prices: (pricesRes.data ?? []).map((p) => ({
      id: p.id,
      programId: p.program_id,
      kind: p.kind,
      amountCents: p.amount_cents,
      label: `${(es ? p.label_es : p.label_en) ?? t(`priceKind.${p.kind}`, { count: p.lessons_included ?? 0 })} · ${formatAud(p.amount_cents)}`,
    })),
  };

  const columns: DataColumn[] = [
    { id: "student", header: t("columns.student"), sortable: true, rowHeader: true },
    { id: "group", header: t("columns.group"), sortable: true },
    { id: "status", header: t("columns.status"), sortable: true, filter: { options: ENROLLMENT_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })) } },
    { id: "billing", header: t("columns.billing") },
    { id: "agreed", header: t("columns.agreed"), sortable: true },
    { id: "paid", header: t("columns.paid"), sortable: true },
    { id: "balance", header: t("columns.balance"), sortable: true },
    { id: "starts", header: t("columns.starts"), sortable: true },
    { id: "actions", header: t("columns.actions"), align: "right" },
  ];
  const sortable = (cents: number) => String(cents).padStart(9, "0");

  const rows: DataRow[] = enrollments.map((e) => {
    const student = e.students?.full_name ?? "—";
    const group = e.groups?.name ?? "—";
    const paid = paidCents(e.enrollment_payments);
    const balance = balanceCents(e.agreed_amount_cents, paid);
    const badge = <StatusBadge tone={ENROLLMENT_TONES[e.status]}>{t(`status.${e.status}`)}</StatusBadge>;
    const balanceCell = balance > 0 ? <span className="font-bold text-danger">{formatAud(balance)}</span> : <span className="text-text-muted">{formatAud(0)}</span>;
    const actions = (
      <RowActions>
        <ModalButton iconOnly label={t("recordPayment")} title={`${t("recordPayment")} · ${student}`} icon={<Banknote className="size-5" strokeWidth={1.75} />} size="md">
          <PaymentForm locale={locale} enrollmentId={e.id} studentId={e.student_id} balanceCents={balance} />
        </ModalButton>
        <ModalButton iconOnly label={t("edit")} title={`${t("editTitle")} · ${student}`} icon={<Pencil className="size-5" strokeWidth={1.75} />} size="md">
          <EnrollmentStatusForm locale={locale} id={e.id} status={e.status} agreedCents={e.agreed_amount_cents} notes={e.notes} />
        </ModalButton>
      </RowActions>
    );
    return {
      id: e.id,
      values: { student, group, status: e.status, billing: e.billing_mode, agreed: sortable(e.agreed_amount_cents ?? 0), paid: sortable(paid), balance: sortable(balance), starts: e.starts_on },
      searchText: `${student} ${group} ${e.groups?.code ?? ""} ${e.notes ?? ""}`,
      cells: {
        student: (
          <Link href={`/${locale}/admin/students/${e.student_id}`} className="font-semibold text-structure underline underline-offset-2">
            {student}
          </Link>
        ),
        group,
        status: badge,
        billing: t(`billing.${e.billing_mode}`),
        agreed: e.agreed_amount_cents === null ? "—" : formatAud(e.agreed_amount_cents),
        paid: formatAud(paid),
        balance: balanceCell,
        starts: formatDay(e.starts_on, locale),
        actions,
      },
      card: (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-text">{student}</p>
              <p className="text-sm text-text-muted">{group}</p>
              <p className="text-sm text-text-muted">
                {t("columns.paid")}: {formatAud(paid)} · {t("columns.balance")}: {formatAud(balance)}
              </p>
            </div>
            {badge}
          </div>
          <div className="mt-2 border-t border-line pt-2">{actions}</div>
        </>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title={t("title")}
        intro={t("intro")}
        action={
          <ModalButton label={t("new")} title={t("newTitle")} defaultOpen={openNew}>
            <EnrollmentForm locale={locale} options={options} groupId={groupId} />
          </ModalButton>
        }
      />
      {tabs}
      {filterNote}
      {enrollments.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("empty")}</p>
      ) : (
        <DataTable caption={t("tabs.enrollments")} columns={columns} rows={rows} searchLabel={t("search")} defaultSort={{ id: "starts", dir: "desc" }} />
      )}
    </>
  );
}

async function RequestsTab({ locale, groupId, header, tabs, filterNote }: { locale: Locale; groupId?: string; header: React.ReactNode; tabs: React.ReactNode; filterNote: React.ReactNode }) {
  const t = await getTranslations({ locale, namespace: "adminEnrollments" });
  const supabase = await createClient();
  let requestsQuery = supabase.from("enrollment_requests").select("*, groups(name, code)").order("created_at", { ascending: false }).limit(1000);
  if (groupId) requestsQuery = requestsQuery.eq("group_id", groupId);
  const { data, error } = await requestsQuery;
  if (error) throw new Error(`enrollment_requests: ${error.code}`);
  const now = new Date();

  const columns: DataColumn[] = [
    { id: "person", header: t("columns.person"), sortable: true, rowHeader: true },
    { id: "contact", header: t("columns.contact") },
    { id: "group", header: t("columns.group"), sortable: true },
    { id: "amount", header: t("columns.amount"), sortable: true },
    { id: "method", header: t("columns.method") },
    { id: "status", header: t("columns.status"), sortable: true, filter: { options: REQUEST_STATUSES.map((s) => ({ value: s, label: t(`requestStatus.${s}`) })) } },
    { id: "expires", header: t("columns.expires"), sortable: true },
    { id: "received", header: t("columns.received"), sortable: true },
    { id: "actions", header: t("columns.actions"), align: "right" },
  ];

  const rows: DataRow[] = data.map((r) => {
    const status = effectiveRequestStatus(r, now) as RequestStatus;
    const group = r.groups?.name ?? "—";
    const badge = <StatusBadge tone={REQUEST_TONES[status]}>{t(`requestStatus.${status}`)}</StatusBadge>;
    const open = status === "pending_payment" || status === "waitlist" || status === "expired";
    const payLink = status === "pending_payment" ? webUrl(r.site_locale === "en" ? "en" : "es", `enrol/pay/${r.token}`) : null;
    const actions = (
      <RowActions>
        {open ? (
          <ModalButton iconOnly label={t("requests.confirm")} title={`${t("requests.confirm")} · ${r.full_name}`} icon={<CircleCheck className="size-5" strokeWidth={1.75} />} size="md">
            <RequestConfirmForm locale={locale} id={r.id} amountCents={r.amount_cents} />
          </ModalButton>
        ) : null}
        {status === "waitlist" || status === "expired" ? <RequestOffer id={r.id} locale={locale} /> : null}
        {payLink ? <CopyPayLink url={payLink} /> : null}
        {status === "converted" && r.student_id ? (
          <IconLink href={`/${locale}/admin/students/${r.student_id}`} label={t("requests.viewStudent")} icon={<UserRound className="size-5" strokeWidth={1.75} />} />
        ) : null}
        <ModalButton iconOnly label={t("requests.notes")} title={`${t("requests.notes")} · ${r.full_name}`} icon={<NotebookPen className="size-5" strokeWidth={1.75} />} size="md">
          {r.message ? <p className="mb-4 rounded-md bg-surface-sunken p-4 whitespace-pre-line text-text">{r.message}</p> : null}
          <RequestNotesForm locale={locale} id={r.id} notes={r.admin_notes} />
        </ModalButton>
        {status !== "converted" && status !== "cancelled" ? <RequestCancel id={r.id} locale={locale} /> : null}
      </RowActions>
    );
    const person = (
      <span className="block">
        <span className="block font-semibold">{r.full_name}</span>
        {r.is_minor && r.guardian_name ? <span className="block text-xs text-text-muted">{t("requests.guardian", { name: r.guardian_name })}</span> : null}
      </span>
    );
    return {
      id: r.id,
      values: {
        person: r.full_name,
        contact: r.email,
        group,
        amount: String(r.amount_cents).padStart(9, "0"),
        method: r.payment_method,
        status,
        expires: status === "pending_payment" ? (r.expires_at ?? "") : "",
        received: r.created_at,
      },
      searchText: `${r.full_name} ${r.guardian_name ?? ""} ${r.email} ${r.phone ?? ""} ${group}`,
      cells: {
        person,
        contact: (
          <span className="block max-w-56">
            <span className="block truncate">{r.email}</span>
            {r.phone ? <span className="block truncate text-xs text-text-muted">{r.phone}</span> : null}
          </span>
        ),
        group,
        amount: formatAud(r.amount_cents),
        method: t(`requestMethod.${r.payment_method === "transfer" ? "transfer" : "stripe"}`),
        status: badge,
        expires: status === "pending_payment" && r.expires_at ? formatInstant(r.expires_at, locale) : "—",
        received: formatInstant(r.created_at, locale),
        actions,
      },
      card: (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {person}
              <p className="text-sm break-all text-text-muted">{r.email}</p>
              <p className="text-sm text-text-muted">
                {group} · {formatAud(r.amount_cents)}
              </p>
            </div>
            {badge}
          </div>
          <div className="mt-2 border-t border-line pt-2">{actions}</div>
        </>
      ),
    };
  });

  return (
    <>
      {header}
      {tabs}
      {filterNote}
      {data.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("requests.empty")}</p>
      ) : (
        <DataTable caption={t("tabs.requests")} columns={columns} rows={rows} searchLabel={t("search")} defaultSort={{ id: "received", dir: "desc" }} />
      )}
    </>
  );
}
