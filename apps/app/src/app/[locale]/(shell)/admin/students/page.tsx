import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type DataColumn, type DataRow } from "@/components/admin/DataTable";
import { PageHeader, RowActions, StatusBadge } from "@/components/admin/PageHeader";
import { linkClass } from "@/components/form-styles";
import { IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale, type Locale } from "@/i18n/routing";
import { listLanguages, listLevels } from "@/lib/data/catalog";
import {
  currentConsentText,
  listConsentTexts,
  listGuardians,
  listStudents,
  type StudentListRow,
} from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { AUDIENCES } from "@/lib/schemas/catalog";
import { STUDENT_STATUSES } from "@/lib/schemas/people";
import { createClient } from "@/lib/supabase/server";
import { ageFrom, formatDay, schoolToday } from "@/lib/time";
import { levelOptions } from "../catalog/programs/options";
import { StudentForm } from "./new/StudentForm";
import { StudentStatusButton } from "./StudentStatusButton";

export default async function StudentsPage({
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
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "students" });
  const te = await getTranslations({ locale, namespace: "enums" });
  const supabase = await createClient();
  const [students, languages, levels, guardians, texts] = await Promise.all([
    listStudents(supabase),
    listLanguages(supabase),
    listLevels(supabase),
    listGuardians(supabase),
    listConsentTexts(supabase),
  ]);
  const text = currentConsentText(texts, "minor_data", schoolToday());

  const href = (id: string) => `/${locale}/admin/students/${id}`;
  const levelLabel = (s: StudentListRow) => (s.levels ? s.levels.code : "—");
  const contact = (s: StudentListRow) => s.student_private?.email ?? s.student_private?.phone ?? "—";
  const ageOf = (s: StudentListRow) => {
    const born = s.student_private?.birth_date;
    return born ? String(ageFrom(born, schoolToday())) : "";
  };
  const portalOf = (s: StudentListRow) => (s.is_minor ? "minor" : s.profile_id ? "yes" : "no");
  const portalLabel = (s: StudentListRow) => t(`portal.${portalOf(s)}`);
  const statusBadge = (s: StudentListRow) => (
    <StatusBadge tone={s.status === "active" ? "success" : "muted"}>{te(`studentStatus.${s.status}`)}</StatusBadge>
  );
  const actions = (s: StudentListRow) => (
    <RowActions>
      <IconLink href={href(s.id)} label={t("actions.edit")} icon={<Pencil className="size-5" strokeWidth={1.75} />} />
      <StudentStatusButton studentId={s.id} locale={locale as Locale} active={s.status === "active"} />
    </RowActions>
  );

  const columns: DataColumn[] = [
    { id: "name", header: t("columns.name"), sortable: true, rowHeader: true },
    {
      id: "level",
      header: t("columns.level"),
      sortable: true,
      filter: { options: [...new Set(levels.map((l) => l.code))].map((code) => ({ value: code, label: code })) },
    },
    { id: "age", header: t("columns.age"), sortable: true },
    {
      id: "audience",
      header: t("columns.audience"),
      sortable: true,
      filter: { options: AUDIENCES.map((a) => ({ value: a, label: te(`audience.${a}`) })) },
    },
    { id: "contact", header: t("columns.contact") },
    {
      id: "status",
      header: t("columns.status"),
      sortable: true,
      filter: { options: STUDENT_STATUSES.map((v) => ({ value: v, label: te(`studentStatus.${v}`) })) },
    },
    {
      id: "portal",
      header: t("columns.portal"),
      filter: { options: (["yes", "no", "minor"] as const).map((v) => ({ value: v, label: t(`portal.${v}`) })) },
    },
    { id: "actions", header: t("columns.actions"), align: "right" },
  ];

  const rows: DataRow[] = students.map((s) => ({
    id: s.id,
    values: {
      name: s.full_name,
      level: s.levels?.code ?? "",
      age: ageOf(s),
      audience: s.audience,
      contact: contact(s),
      status: s.status,
      portal: portalOf(s),
    },
    searchText: `${s.full_name} ${s.student_private?.email ?? ""} ${s.student_private?.phone ?? ""}`,
    cells: {
      name: <Link href={href(s.id)} className={linkClass}>{s.full_name}</Link>,
      level: levelLabel(s),
      age: ageOf(s) || "—",
      audience: te(`audience.${s.audience}`),
      contact: <span className="block max-w-56 truncate">{contact(s)}</span>,
      status: statusBadge(s),
      portal: portalLabel(s),
      actions: actions(s),
    },
    card: (
      <>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={href(s.id)} className={`${linkClass} inline-flex min-h-11 items-center`}>
              {s.full_name}
            </Link>
            <p className="text-sm text-text-muted">
              {te(`audience.${s.audience}`)} · {levelLabel(s)}
              {ageOf(s) ? ` · ${t("ageYears", { age: ageOf(s) })}` : ""}
            </p>
            <p className="truncate text-sm text-text-muted">{contact(s)}</p>
          </div>
          {statusBadge(s)}
        </div>
        <div className="mt-2 border-t border-line pt-2">{actions(s)}</div>
      </>
    ),
  }));

  return (
    <>
      <PageHeader
        title={t("title")}
        intro={t("intro")}
        action={
          <ModalButton label={t("new.title")} defaultOpen={sp.new === "1"} size="lg">
              <p className="mb-5 text-sm text-text-muted">{t("new.intro")}</p>
              <StudentForm
                locale={locale}
                levels={levelOptions(levels, languages, locale)}
                guardians={guardians.map((g) => ({ id: g.id, name: g.full_name, email: g.email, phone: g.phone }))}
                consentText={
                  text
                    ? {
                        id: text.id,
                        body: locale === "en" ? text.body_en : text.body_es,
                        effectiveFrom: formatDay(text.effective_from, locale),
                      }
                    : null
                }
              />
            </ModalButton>
        }
      />

      <DataTable caption={t("title")} columns={columns} rows={rows} searchLabel={t("filters.search")} defaultSort={{ id: "name" }} />
    </>
  );
}
