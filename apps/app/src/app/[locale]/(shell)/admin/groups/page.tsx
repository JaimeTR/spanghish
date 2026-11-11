import { ClipboardList, Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type DataColumn, type DataRow } from "@/components/admin/DataTable";
import { PageHeader, RowActions, StatusBadge } from "@/components/admin/PageHeader";
import { IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { listLocations, listPrograms } from "@/lib/data/catalog";
import { listTeachers } from "@/lib/data/people";
import { seatsTaken } from "@/lib/enrollments/status";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/time";
import { GroupDelete, GroupForm, type GroupOptions } from "./GroupForm";

const TONES = { draft: "warning", active: "success", completed: "info", cancelled: "muted" } as const;
const STATUSES = ["draft", "active", "completed", "cancelled"] as const;

/** Grupos: la clase real de una edición, con docente, sede, cupo y ocupación. */
export default async function GroupsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ new?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "adminGroups" });
  const supabase = await createClient();
  const es = locale === "es";

  const [groupsRes, editionsRes, programs, teachers, locations] = await Promise.all([
    supabase
      .from("groups")
      .select("*, programs(name_es, name_en), program_editions(label_es, label_en, starts_on), locations(name), enrollments(status), enrollment_requests(status, expires_at)")
      .order("code")
      .limit(500),
    supabase.from("program_editions").select("id, program_id, label_es, label_en, starts_on").order("starts_on", { ascending: false }).limit(500),
    listPrograms(supabase, { active: true }),
    listTeachers(supabase),
    listLocations(supabase),
  ]);
  if (groupsRes.error) throw new Error(`groups: ${groupsRes.error.code}`);
  if (editionsRes.error) throw new Error(`program_editions: ${editionsRes.error.code}`);
  const groups = groupsRes.data;
  const now = new Date();
  const teacherName = new Map(teachers.map((u) => [u.id, u.fullName ?? u.email ?? "—"]));

  const options: GroupOptions = {
    programs: programs.map((p) => ({ id: p.id, name: es ? p.name_es : p.name_en, format: p.format })),
    editions: editionsRes.data.map((e) => ({ id: e.id, programId: e.program_id, label: `${(es ? e.label_es : e.label_en) ?? ""} ${formatDay(e.starts_on, locale)}`.trim() })),
    teachers: teachers.map((u) => ({ id: u.id, name: u.fullName ?? u.email ?? u.id })),
    locations: locations.filter((l) => l.active).map((l) => ({ id: l.id, name: l.name })),
  };

  const columns: DataColumn[] = [
    { id: "name", header: t("columns.group"), sortable: true, rowHeader: true },
    { id: "program", header: t("columns.program"), sortable: true },
    { id: "teacher", header: t("columns.teacher"), sortable: true },
    { id: "location", header: t("columns.location") },
    { id: "seats", header: t("columns.seats"), sortable: true },
    { id: "status", header: t("columns.status"), sortable: true, filter: { options: STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })) } },
    { id: "public", header: t("columns.public"), filter: { options: (["yes", "no"] as const).map((v) => ({ value: v, label: t(`public.${v}`) })) } },
    { id: "actions", header: t("columns.actions"), align: "right" },
  ];

  const rows: DataRow[] = groups.map((g) => {
    const program = g.programs ? (es ? g.programs.name_es : g.programs.name_en) : "—";
    const edition = g.program_editions ? `${(es ? g.program_editions.label_es : g.program_editions.label_en) ?? ""} ${formatDay(g.program_editions.starts_on, locale)}`.trim() : null;
    const teacher = g.teacher_id ? (teacherName.get(g.teacher_id) ?? "—") : t("unassigned");
    const taken = seatsTaken(g.enrollments, g.enrollment_requests, now);
    const seats = `${taken}/${g.capacity}`;
    const badge = <StatusBadge tone={TONES[g.status]}>{t(`status.${g.status}`)}</StatusBadge>;
    const actions = (
      <RowActions>
        <IconLink href={`/${locale}/admin/enrollments?group=${g.id}`} label={t("viewEnrollments")} icon={<ClipboardList className="size-5" strokeWidth={1.75} />} />
        <ModalButton iconOnly label={t("edit")} title={t("editTitle")} icon={<Pencil className="size-5" strokeWidth={1.75} />}>
          <GroupForm locale={locale} options={options} group={g} />
        </ModalButton>
        <GroupDelete id={g.id} locale={locale} />
      </RowActions>
    );
    return {
      id: g.id,
      values: { name: g.name, program, teacher, location: g.locations?.name ?? "", seats: String(taken).padStart(3, "0"), status: g.status, public: g.is_public ? "yes" : "no" },
      searchText: `${g.name} ${g.code} ${program} ${teacher}`,
      cells: {
        name: (
          <span className="block">
            <span className="block font-semibold">{g.name}</span>
            <span className="block text-xs text-text-muted">{g.code}</span>
          </span>
        ),
        program: (
          <span className="block max-w-64">
            <span className="block">{program}</span>
            {edition ? <span className="block text-xs text-text-muted">{edition}</span> : null}
          </span>
        ),
        teacher,
        location: g.locations?.name ?? "—",
        seats: <span className={taken >= g.capacity ? "font-bold text-danger" : "font-semibold"}>{seats}</span>,
        status: badge,
        public: t(`public.${g.is_public ? "yes" : "no"}`),
        actions,
      },
      card: (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-text">{g.name}</p>
              <p className="text-sm text-text-muted">
                {g.code} · {program}
              </p>
              <p className="text-sm text-text-muted">
                {teacher} · {t("columns.seats")}: {seats}
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
          <ModalButton label={t("new")} title={t("newTitle")} defaultOpen={(await searchParams).new === "1"}>
            <GroupForm locale={locale} options={options} />
          </ModalButton>
        }
      />
      {groups.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("empty")}</p>
      ) : (
        <DataTable caption={t("title")} columns={columns} rows={rows} searchLabel={t("search")} defaultSort={{ id: "name" }} />
      )}
    </>
  );
}
