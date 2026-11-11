import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type DataColumn, type DataRow } from "@/components/admin/DataTable";
import { PageHeader, RowActions, StatusBadge } from "@/components/admin/PageHeader";
import { linkClass } from "@/components/form-styles";
import { IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { listLanguages, listLevels, listPrograms } from "@/lib/data/catalog";
import { AUDIENCES, FORMATS } from "@/lib/schemas/catalog";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { languageOptions, levelOptions } from "./options";
import { ProgramForm } from "./ProgramForm";

export default async function ProgramsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ new?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "catalog" });
  const te = await getTranslations({ locale, namespace: "enums" });
  const { new: openNew } = await searchParams;
  const supabase = await createClient();
  const [programs, languages, levels] = await Promise.all([listPrograms(supabase), listLanguages(supabase), listLevels(supabase)]);
  const nameOf = (p: { name_es: string; name_en: string }) => (locale === "en" ? p.name_en : p.name_es);
  const href = (id: string) => `/${locale}/admin/catalog/programs/${id}`;

  const stateLabel = (p: { active: boolean }) => (p.active ? t("active") : t("inactive"));
  const columns: DataColumn[] = [
    { id: "name", header: t("programs.name"), sortable: true, rowHeader: true },
    { id: "code", header: t("programs.code"), sortable: true },
    {
      id: "audience",
      header: t("programs.audience"),
      sortable: true,
      filter: { options: AUDIENCES.map((a) => ({ value: a, label: te(`audience.${a}`) })) },
    },
    {
      id: "format",
      header: t("programs.format"),
      sortable: true,
      filter: { options: FORMATS.map((f) => ({ value: f, label: te(`format.${f}`) })) },
    },
    {
      id: "state",
      header: t("programs.state"),
      sortable: true,
      filter: {
        options: [
          { value: "active", label: t("active") },
          { value: "inactive", label: t("inactive") },
        ],
      },
    },
    { id: "actions", header: t("programs.actions"), align: "right" },
  ];
  const rows: DataRow[] = programs.map((p) => ({
    id: p.id,
    values: {
      name: nameOf(p),
      code: p.code,
      audience: p.audience,
      format: p.format,
      state: p.active ? "active" : "inactive",
    },
    searchText: `${p.name_es} ${p.name_en} ${p.code}`,
    cells: {
      name: <Link href={href(p.id)} className={linkClass}>{nameOf(p)}</Link>,
      code: <span className="font-mono text-xs">{p.code}</span>,
      audience: te(`audience.${p.audience}`),
      format: te(`format.${p.format}`),
      state: (
        <>
          <StatusBadge tone={p.active ? "success" : "muted"}>{stateLabel(p)}</StatusBadge>
          {p.is_public ? <span className="ml-2 text-xs text-text-muted">{t("programs.public")}</span> : null}
        </>
      ),
      actions: (
        <RowActions>
          <IconLink href={href(p.id)} label={t("programs.edit")} icon={<Pencil className="size-5" strokeWidth={1.75} />} />
        </RowActions>
      ),
    },
    card: (
      <>
        <Link href={href(p.id)} className={`${linkClass} inline-flex min-h-11 items-center`}>
          {nameOf(p)}
        </Link>
        <p className="text-sm text-text-muted">
          {te(`audience.${p.audience}`)} · {te(`format.${p.format}`)} · {stateLabel(p)}
        </p>
      </>
    ),
  }));

  return (
    <>
      <PageHeader
        title={t("programs.title")}
        intro={t("programs.intro")}
        back={{ href: `/${locale}/admin/catalog`, label: t("title") }}
        action={
          <ModalButton label={t("programs.new")} title={t("programs.new")} size="lg" defaultOpen={openNew === "1"}>
            <p className="mb-5 text-sm text-text-muted">{t("programs.newIntro")}</p>
            <ProgramForm
              locale={locale}
              languages={languageOptions(languages, locale)}
              levels={levelOptions(levels, languages, locale)}
            />
          </ModalButton>
        }
      />

      {programs.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("programs.empty")}</p>
      ) : (
        <DataTable caption={t("programs.title")} columns={columns} rows={rows} searchLabel={t("programs.search")} defaultSort={{ id: "name" }} />
      )}
    </>
  );
}
