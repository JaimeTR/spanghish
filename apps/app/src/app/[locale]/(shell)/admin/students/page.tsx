import { Pencil, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, RowActions, SortableTh, StatusBadge, TableCard, tableClass, tdClass, thClass } from "@/components/admin/PageHeader";
import { inputClass, labelClass, linkClass } from "@/components/form-styles";
import { IconButton, IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale, type Locale } from "@/i18n/routing";
import { listLanguages, listLevels } from "@/lib/data/catalog";
import {
  currentConsentText,
  listConsentTexts,
  listGuardians,
  listStudents,
  type AudienceSegment,
  type StudentListRow,
  type StudentStatus,
} from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { AUDIENCES } from "@/lib/schemas/catalog";
import { STUDENT_STATUSES } from "@/lib/schemas/people";
import { createClient } from "@/lib/supabase/server";
import { formatDay, schoolToday } from "@/lib/time";
import { levelOptions } from "../catalog/programs/options";
import { StudentForm } from "./new/StudentForm";
import { StudentStatusButton } from "./StudentStatusButton";

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((a) => a === value);
}

const SORTS = ["name", "level", "audience", "status"] as const;
type Sort = (typeof SORTS)[number];

function sortValue(student: StudentListRow, sort: Sort): string {
  if (sort === "level") return student.levels?.code ?? "";
  if (sort === "audience") return student.audience;
  if (sort === "status") return student.status;
  return student.full_name;
}

export default async function StudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; audience?: string; status?: string; sort?: string; dir?: string; new?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const sp = await searchParams;
  const search = typeof sp.search === "string" ? sp.search.slice(0, 80) : "";
  const audience: AudienceSegment | undefined = pick(sp.audience, AUDIENCES);
  const status: StudentStatus | undefined = pick(sp.status, STUDENT_STATUSES);
  const sort: Sort = pick(sp.sort, SORTS) ?? "name";
  const direction = sp.dir === "desc" ? "desc" : "asc";

  const t = await getTranslations({ locale, namespace: "students" });
  const te = await getTranslations({ locale, namespace: "enums" });
  const supabase = await createClient();
  const [listed, languages, levels, guardians, texts] = await Promise.all([
    listStudents(supabase, { search, audience, status }),
    listLanguages(supabase),
    listLevels(supabase),
    listGuardians(supabase),
    listConsentTexts(supabase),
  ]);
  // La base ya los trae por nombre; aquí se reordena por la columna elegida (el nombre desempata).
  const collator = new Intl.Collator(locale);
  const students = [...listed].sort(
    (a, b) =>
      (collator.compare(sortValue(a, sort), sortValue(b, sort)) || collator.compare(a.full_name, b.full_name)) *
      (direction === "desc" ? -1 : 1),
  );
  const text = currentConsentText(texts, "minor_data", schoolToday());

  const href = (id: string) => `/${locale}/admin/students/${id}`;
  const sortHref = (key: Sort) => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (audience) query.set("audience", audience);
    if (status) query.set("status", status);
    query.set("sort", key);
    query.set("dir", sort === key && direction === "asc" ? "desc" : "asc");
    return `?${query}`;
  };
  const levelLabel = (s: StudentListRow) => (s.levels ? s.levels.code : "—");
  const contact = (s: StudentListRow) => s.student_private?.email ?? s.student_private?.phone ?? "—";
  const portal = (s: StudentListRow) => (s.is_minor ? t("portal.minor") : s.profile_id ? t("portal.yes") : t("portal.no"));
  const statusBadge = (s: StudentListRow) => (
    <StatusBadge tone={s.status === "active" ? "success" : "muted"}>{te(`studentStatus.${s.status}`)}</StatusBadge>
  );
  const actions = (s: StudentListRow) => (
    <RowActions>
      <IconLink href={href(s.id)} label={t("actions.edit")} icon={<Pencil className="size-5" strokeWidth={1.75} />} />
      <StudentStatusButton studentId={s.id} locale={locale as Locale} active={s.status === "active"} />
    </RowActions>
  );

  return (
    <>
      <PageHeader
        title={t("title")}
        intro={t("intro")}
        action={
          <div className="flex flex-wrap items-center gap-4">
            <Link href={`/${locale}/admin/settings/consent-texts`} className={linkClass}>
              {t("consentTexts")}
            </Link>
            <ModalButton label={t("new.title")} defaultOpen={sp.new === "1"} size="lg">
              <p className="mb-5 text-sm text-text-muted">{t("new.intro")}</p>
              <StudentForm
                locale={locale}
                levels={levelOptions(levels, languages, locale)}
                guardians={guardians.map((g) => ({ value: g.id, label: `${g.full_name} (${g.email})` }))}
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
          </div>
        }
      />

      {/* Filtros en la URL (GET): funcionan sin JS y se pueden compartir. */}
      <form method="get" role="search" aria-label={t("filters.label")} className="mt-8 grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        {/* El orden se conserva al filtrar; con el de por defecto la dirección queda limpia. */}
        {sort !== "name" || direction !== "asc" ? (
          <>
            <input type="hidden" name="sort" value={sort} />
            <input type="hidden" name="dir" value={direction} />
          </>
        ) : null}
        <div>
          <label htmlFor="search" className={labelClass}>{t("filters.search")}</label>
          <input id="search" name="search" type="search" defaultValue={search} maxLength={80} className={inputClass} />
        </div>
        <div>
          <label htmlFor="audience" className={labelClass}>{t("filters.audience")}</label>
          <select id="audience" name="audience" defaultValue={audience ?? ""} className={inputClass}>
            <option value="">{t("filters.all")}</option>
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>{te(`audience.${a}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className={labelClass}>{t("filters.status")}</label>
          <select id="status" name="status" defaultValue={status ?? ""} className={inputClass}>
            <option value="">{t("filters.all")}</option>
            {STUDENT_STATUSES.map((s) => (
              <option key={s} value={s}>{te(`studentStatus.${s}`)}</option>
            ))}
          </select>
        </div>
        <IconButton type="submit" tone="primary" label={t("filters.apply")} icon={<Search className="size-5" strokeWidth={2} />} className="border border-line sm:mb-0.5" />
      </form>

      <p role="status" className="mt-4 text-sm text-text-muted">
        {t("count", { count: students.length })}
      </p>

      {students.length === 0 ? null : (
        <>
          <TableCard>
            <table className={tableClass}>
              <caption className="sr-only">{t("title")}</caption>
              <thead>
                <tr>
                  <SortableTh href={sortHref("name")} active={sort === "name"} direction={direction}>{t("columns.name")}</SortableTh>
                  <SortableTh href={sortHref("level")} active={sort === "level"} direction={direction}>{t("columns.level")}</SortableTh>
                  <SortableTh href={sortHref("audience")} active={sort === "audience"} direction={direction}>{t("columns.audience")}</SortableTh>
                  <th scope="col" className={thClass}>{t("columns.contact")}</th>
                  <SortableTh href={sortHref("status")} active={sort === "status"} direction={direction}>{t("columns.status")}</SortableTh>
                  <th scope="col" className={thClass}>{t("columns.portal")}</th>
                  <th scope="col" className={`${thClass} text-right`}>{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-sunken/40">
                    <th scope="row" className={`${tdClass} font-semibold`}>
                      <Link href={href(s.id)} className={linkClass}>{s.full_name}</Link>
                    </th>
                    <td className={tdClass}>{levelLabel(s)}</td>
                    <td className={tdClass}>{te(`audience.${s.audience}`)}</td>
                    <td className={`${tdClass} max-w-56 truncate`}>{contact(s)}</td>
                    <td className={tdClass}>{statusBadge(s)}</td>
                    <td className={tdClass}>{portal(s)}</td>
                    <td className={tdClass}>{actions(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
          <ul className="mt-4 flex flex-col gap-3 md:hidden">
            {students.map((s) => (
              <li key={s.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={href(s.id)} className={`${linkClass} inline-flex min-h-11 items-center`}>
                      {s.full_name}
                    </Link>
                    <p className="text-sm text-text-muted">
                      {te(`audience.${s.audience}`)} · {levelLabel(s)}
                    </p>
                    <p className="truncate text-sm text-text-muted">{contact(s)}</p>
                  </div>
                  {statusBadge(s)}
                </div>
                <div className="mt-2 border-t border-line pt-2">{actions(s)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
