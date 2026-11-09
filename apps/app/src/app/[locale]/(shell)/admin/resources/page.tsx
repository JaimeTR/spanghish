import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, Section, buttonLinkClass } from "@/components/admin/PageHeader";
import { AccessBadge } from "@/components/content/AccessBadge";
import { MoveButtons } from "@/components/content/MoveButtons";
import { isLocale } from "@/i18n/routing";
import { listAdminResources } from "@/lib/data/content";
import { createClient } from "@/lib/supabase/server";
import { requireArea } from "@/lib/require-area";
import { moveResource } from "./actions";
import { ResourcePublishButton } from "./ResourcePublishButton";

export default async function ResourcesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string; kind?: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); await requireArea(locale, "admin");
  const filters = await searchParams;
  const [t, supabase] = await Promise.all([getTranslations({ locale, namespace: "content.resources" }), createClient()]);
  const status = filters.status === "draft" || filters.status === "published" ? filters.status : undefined;
  const kinds = ["video", "document", "link", "worksheet", "vocabulary", "recording", "coursework"] as const;
  const kind = kinds.find((value) => value === filters.kind);
  const rows = await listAdminResources(supabase, { status, kind });
  const sections = ["public", "account", "enrolled"] as const;
  return <><PageHeader title={t("title")} intro={t("intro")} action={<Link className={buttonLinkClass} href={`/${locale}/admin/resources/new`}>{t("new")}</Link>} />
    <form className="mt-5 flex flex-wrap items-end gap-3" method="get"><label className="grid gap-1">{t("filterStatus")}<select name="status" defaultValue={status ?? ""} className="min-h-11 rounded border border-line bg-surface px-3"><option value="">{t("all")}</option><option value="draft">{t("statusNames.draft")}</option><option value="published">{t("statusNames.published")}</option></select></label><label className="grid gap-1">{t("filterKind")}<select name="kind" defaultValue={kind ?? ""} className="min-h-11 rounded border border-line bg-surface px-3"><option value="">{t("all")}</option>{kinds.map((value) => <option key={value} value={value}>{t(`kindNames.${value}`)}</option>)}</select></label><button className="min-h-11 rounded border border-line px-4" type="submit">{t("filter")}</button></form>
    {sections.map((access) => <Section key={access} id={`resources-${access}`} title={t("section", { level: t(`levelNames.${access}`) })}>
      {rows.filter((row) => row.access_level === access).length === 0 ? <p>{t("empty")}</p> : <ul className="divide-y divide-line">{rows.filter((row) => row.access_level === access).map((row, index, group) => <li key={row.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><Link className="font-semibold underline" href={`/${locale}/admin/resources/${row.id}`}>{locale === "es" ? row.title_es : row.title_en}</Link><p className="text-sm text-text-muted">{t(`kindNames.${row.kind}`)} · {row.levelCode ?? "—"} · <AccessBadge level={row.access_level} />{row.file_size_bytes ? ` · ${Math.ceil(row.file_size_bytes / 1024)} KB` : ""}</p></div>
        <div className="flex flex-wrap items-center gap-2"><span>{t(`statusNames.${row.status}`)}</span>
          <MoveButtons id={row.id} action={moveResource} first={index === 0} last={index === group.length - 1} labelUp={t("moveUp", { title: row.title_es })} labelDown={t("moveDown", { title: row.title_es })} locale={locale} />
          <ResourcePublishButton id={row.id} locale={locale} published={row.status === "published"} />
        </div>
      </li>)}</ul>}
    </Section>)}</>;
}
