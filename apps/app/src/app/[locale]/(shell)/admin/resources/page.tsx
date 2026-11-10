import { Pencil, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, Section, StatusBadge } from "@/components/admin/PageHeader";
import { AccessBadge } from "@/components/content/AccessBadge";
import { MoveButtons } from "@/components/content/MoveButtons";
import { IconButton, IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { listAdminResources, listLevels } from "@/lib/data/content";
import { createClient } from "@/lib/supabase/server";
import { requireArea } from "@/lib/require-area";
import { moveResource } from "./actions";
import { ResourceDeleteButton } from "./ResourceDeleteButton";
import { ResourceForm } from "./ResourceForm";
import { ResourcePublishButton } from "./ResourcePublishButton";

export default async function ResourcesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string; kind?: string; new?: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); await requireArea(locale, "admin");
  const filters = await searchParams;
  const [t, supabase] = await Promise.all([getTranslations({ locale, namespace: "content.resources" }), createClient()]);
  const status = filters.status === "draft" || filters.status === "published" ? filters.status : undefined;
  const kinds = ["video", "document", "link", "worksheet", "vocabulary", "recording", "coursework"] as const;
  const kind = kinds.find((value) => value === filters.kind);
  const [rows, levels] = await Promise.all([listAdminResources(supabase, { status, kind }), listLevels(supabase)]);
  const sections = ["public", "account", "enrolled"] as const;
  return <>
    <PageHeader title={t("title")} intro={t("intro")} action={<ModalButton label={t("new")} size="xl" defaultOpen={filters.new === "1"}><ResourceForm locale={locale} levels={levels} /></ModalButton>} />
    <form className="mt-5 flex flex-wrap items-end gap-3" method="get">
      <label className="grid gap-1">{t("filterStatus")}<select name="status" defaultValue={status ?? ""} className="min-h-11 rounded border border-line bg-surface px-3"><option value="">{t("all")}</option><option value="draft">{t("statusNames.draft")}</option><option value="published">{t("statusNames.published")}</option></select></label>
      <label className="grid gap-1">{t("filterKind")}<select name="kind" defaultValue={kind ?? ""} className="min-h-11 rounded border border-line bg-surface px-3"><option value="">{t("all")}</option>{kinds.map((value) => <option key={value} value={value}>{t(`kindNames.${value}`)}</option>)}</select></label>
      <IconButton type="submit" tone="primary" label={t("filter")} icon={<Search className="size-5" strokeWidth={2} />} className="border border-line" />
    </form>
    {sections.map((access) => {
      const group = rows.filter((row) => row.access_level === access);
      return <Section key={access} id={`resources-${access}`} title={t("section", { level: t(`levelNames.${access}`) })}>
        {group.length === 0 ? <p>{t("empty")}</p> : <ul className="divide-y divide-line">{group.map((row, index) => <li key={row.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><Link className="font-semibold underline" href={`/${locale}/admin/resources/${row.id}`}>{locale === "es" ? row.title_es : row.title_en}</Link><p className="text-sm text-text-muted">{t(`kindNames.${row.kind}`)} · {row.levelCode ?? "—"} · <AccessBadge level={row.access_level} />{row.file_size_bytes ? ` · ${Math.ceil(row.file_size_bytes / 1024)} KB` : ""}</p></div>
          <div className="flex flex-wrap items-center gap-0.5 sm:justify-end"><span className="mr-2"><StatusBadge tone={row.status === "published" ? "success" : "muted"}>{t(`statusNames.${row.status}`)}</StatusBadge></span>
            <MoveButtons id={row.id} action={moveResource} first={index === 0} last={index === group.length - 1} labelUp={t("moveUp", { title: row.title_es })} labelDown={t("moveDown", { title: row.title_es })} locale={locale} />
            <ResourcePublishButton id={row.id} locale={locale} published={row.status === "published"} />
            <IconLink href={`/${locale}/admin/resources/${row.id}`} label={t("edit")} icon={<Pencil className="size-5" strokeWidth={1.75} />} />
            <ResourceDeleteButton id={row.id} locale={locale} className="" />
          </div>
        </li>)}</ul>}
      </Section>;
    })}</>;
}
