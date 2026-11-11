import { Eye } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type DataColumn, type DataRow } from "@/components/admin/DataTable";
import { PageHeader, RowActions, StatusBadge } from "@/components/admin/PageHeader";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatInstant } from "@/lib/time";
import { LEAD_STATUSES } from "@/lib/lead-status";
import { LeadForm } from "./LeadForm";

const TONES = { new: "warning", contacted: "info", converted: "success", discarded: "muted" } as const;

export default async function LeadsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "leads" });
  const { data, error } = await (await createClient())
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`leads: ${error.code}`);
  const leads = data;
  const label = (group: string, value: string | null) => (value ? t(`${group}.${value}`) : "—");

  const columns: DataColumn[] = [
    { id: "name", header: t("columns.name"), sortable: true, rowHeader: true },
    { id: "contact", header: t("columns.contact") },
    {
      id: "kind",
      header: t("columns.kind"),
      filter: { options: (["booking", "contact"] as const).map((k) => ({ value: k, label: t(`kind.${k}`) })) },
    },
    { id: "interest", header: t("columns.interest") },
    { id: "date", header: t("columns.date"), sortable: true },
    {
      id: "status",
      header: t("columns.status"),
      sortable: true,
      filter: { options: LEAD_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })) },
    },
    { id: "actions", header: t("columns.actions"), align: "right" },
  ];

  const rows: DataRow[] = leads.map((l) => {
    const interest = [l.audience ? t(`audience.${l.audience}`) : null, l.place ? t(`place.${l.place}`) : null].filter(Boolean).join(" · ");
    const badge = <StatusBadge tone={TONES[l.status as keyof typeof TONES] ?? "muted"}>{t(`status.${l.status as (typeof LEAD_STATUSES)[number]}`)}</StatusBadge>;
    const detail = (
      <ModalButton iconOnly label={t("open")} title={l.full_name} icon={<Eye className="size-5" strokeWidth={1.75} />} size="lg">
        <dl className="mb-6 grid gap-3 sm:grid-cols-[10rem_1fr]">
          {(
            [
              [t("columns.kind"), t(`kind.${l.kind as "booking" | "contact"}`)],
              [t("detail.email"), l.email],
              [t("detail.phone"), l.phone ?? "—"],
              [t("detail.audience"), label("audience", l.audience)],
              [t("detail.place"), label("place", l.place)],
              [t("detail.times"), l.times ?? "—"],
              [t("detail.language"), label("language", l.language)],
              [t("detail.siteLocale"), l.site_locale.toUpperCase()],
              [t("columns.date"), formatInstant(l.created_at, locale)],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-sm font-semibold text-text-muted">{k}</dt>
              <dd className="min-w-0 break-words text-text">{v}</dd>
            </div>
          ))}
        </dl>
        <h3 className="mb-1 text-sm font-semibold text-text-muted">{t("detail.message")}</h3>
        <p className="mb-6 rounded-md bg-surface-sunken p-4 whitespace-pre-line text-text">{l.message ?? "—"}</p>
        <p className="mb-6 text-sm">
          <a className="font-semibold text-primary underline" href={`mailto:${l.email}`}>
            {t("detail.reply")}
          </a>
        </p>
        <LeadForm locale={locale} id={l.id} status={l.status} notes={l.admin_notes} />
      </ModalButton>
    );
    return {
      id: l.id,
      values: {
        name: l.full_name,
        contact: l.email,
        kind: l.kind,
        interest,
        date: l.created_at,
        status: l.status,
      },
      searchText: `${l.full_name} ${l.email} ${l.phone ?? ""} ${l.message ?? ""}`,
      cells: {
        name: l.full_name,
        contact: (
          <span className="block max-w-56">
            <span className="block truncate">{l.email}</span>
            {l.phone ? <span className="block truncate text-xs text-text-muted">{l.phone}</span> : null}
          </span>
        ),
        kind: t(`kind.${l.kind as "booking" | "contact"}`),
        interest: interest || "—",
        date: formatInstant(l.created_at, locale),
        status: badge,
        actions: <RowActions>{detail}</RowActions>,
      },
      card: (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-text">{l.full_name}</p>
              <p className="text-sm break-all text-text-muted">{l.email}</p>
              <p className="text-sm text-text-muted">
                {t(`kind.${l.kind as "booking" | "contact"}`)} · {formatInstant(l.created_at, locale)}
              </p>
            </div>
            {badge}
          </div>
          <div className="mt-2 border-t border-line pt-2">
            <RowActions>{detail}</RowActions>
          </div>
        </>
      ),
    };
  });

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      {leads.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("empty")}</p>
      ) : (
        <DataTable caption={t("title")} columns={columns} rows={rows} searchLabel={t("search")} defaultSort={{ id: "date", dir: "desc" }} />
      )}
    </>
  );
}
