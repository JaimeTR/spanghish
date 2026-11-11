import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ACCESS_LEVELS, RESOURCE_KINDS } from "@spanglish/content";
import { DataTable, type DataColumn, type DataRow } from "@/components/admin/DataTable";
import { PageHeader, RowActions, StatusBadge } from "@/components/admin/PageHeader";
import { AccessBadge } from "@/components/content/AccessBadge";
import { CoverThumb } from "@/components/content/Cover";
import { MoveButtons } from "@/components/content/MoveButtons";
import { linkClass } from "@/components/form-styles";
import { IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { listAdminResources, listLevels } from "@/lib/data/content";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { moveResource } from "./actions";
import { ResourceDeleteButton } from "./ResourceDeleteButton";
import { ResourceForm } from "./ResourceForm";
import { ResourcePublishButton } from "./ResourcePublishButton";

export default async function ResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const filters = await searchParams;
  const [t, supabase] = await Promise.all([getTranslations({ locale, namespace: "content.resources" }), createClient()]);
  const [rows, levels] = await Promise.all([listAdminResources(supabase), listLevels(supabase)]);
  const titleOf = (r: (typeof rows)[number]) => (locale === "es" ? r.title_es : r.title_en);
  const href = (id: string) => `/${locale}/admin/resources/${id}`;
  // Subir/bajar mueve el recurso dentro de su nivel de acceso.
  const group = (r: (typeof rows)[number]) => rows.filter((x) => x.access_level === r.access_level);

  const columns: DataColumn[] = [
    { id: "title", header: t("titleLabel"), sortable: true, rowHeader: true },
    {
      id: "kind",
      header: t("kind"),
      sortable: true,
      filter: { options: RESOURCE_KINDS.map((k) => ({ value: k, label: t(`kindNames.${k}`) })) },
    },
    {
      id: "level",
      header: t("level"),
      sortable: true,
      filter: { options: levels.map((l) => ({ value: l.code, label: l.code })) },
    },
    {
      id: "access",
      header: t("access"),
      filter: { options: ACCESS_LEVELS.map((a) => ({ value: a, label: t(`levelNames.${a}`) })) },
    },
    {
      id: "status",
      header: t("columns.status"),
      sortable: true,
      filter: { options: (["draft", "published"] as const).map((s) => ({ value: s, label: t(`statusNames.${s}`) })) },
    },
    { id: "actions", header: t("columns.actions"), align: "right" },
  ];

  const tableRows: DataRow[] = rows.map((row) => {
    const siblings = group(row);
    const index = siblings.findIndex((x) => x.id === row.id);
    const badge = (
      <StatusBadge tone={row.status === "published" ? "success" : "muted"}>{t(`statusNames.${row.status}`)}</StatusBadge>
    );
    const actions = (
      <RowActions>
        <MoveButtons
          id={row.id}
          action={moveResource}
          first={index === 0}
          last={index === siblings.length - 1}
          labelUp={t("moveUp", { title: titleOf(row) })}
          labelDown={t("moveDown", { title: titleOf(row) })}
          locale={locale}
        />
        <ResourcePublishButton id={row.id} locale={locale} published={row.status === "published"} />
        <IconLink href={href(row.id)} label={t("edit")} icon={<Pencil className="size-5" strokeWidth={1.75} />} />
        <ResourceDeleteButton id={row.id} locale={locale} className="" />
      </RowActions>
    );
    return {
      id: row.id,
      values: {
        title: titleOf(row),
        kind: row.kind,
        level: row.levelCode ?? "",
        access: row.access_level,
        status: row.status,
      },
      searchText: `${row.title_es} ${row.title_en} ${row.levelCode ?? ""}`,
      cells: {
        title: (
          <span className="flex items-center gap-3">
            <CoverThumb path={row.thumbnail_path} size={44} />
            <span className="min-w-0">
              <Link href={href(row.id)} className={linkClass}>
                {titleOf(row)}
              </Link>
              {row.file_size_bytes ? (
                <span className="block text-xs font-normal text-text-muted">{Math.ceil(row.file_size_bytes / 1024)} KB</span>
              ) : null}
            </span>
          </span>
        ),
        kind: t(`kindNames.${row.kind}`),
        level: row.levelCode ?? "—",
        access: <AccessBadge level={row.access_level} />,
        status: badge,
        actions,
      },
      card: (
        <>
          <div className="flex items-start gap-3">
            <CoverThumb path={row.thumbnail_path} size={56} />
            <div className="min-w-0 flex-1">
              <Link href={href(row.id)} className={`${linkClass} inline-flex min-h-11 items-center`}>
                {titleOf(row)}
              </Link>
              <p className="text-sm text-text-muted">
                {t(`kindNames.${row.kind}`)} · {row.levelCode ?? "—"}
              </p>
              <AccessBadge level={row.access_level} />
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
          <ModalButton label={t("new")} size="xl" defaultOpen={filters.new === "1"}>
            <ResourceForm locale={locale} levels={levels} />
          </ModalButton>
        }
      />
      {rows.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("empty")}</p>
      ) : (
        <DataTable caption={t("title")} columns={columns} rows={tableRows} searchLabel={t("search")} defaultSort={{ id: "title" }} />
      )}
    </>
  );
}
