import { Button } from "@spanglish/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonLinkClass, PageHeader, tableClass, tdClass, thClass } from "@/components/admin/PageHeader";
import { inputClass, labelClass, linkClass } from "@/components/form-styles";
import { isLocale } from "@/i18n/routing";
import { listStudents, type AudienceSegment, type StudentStatus } from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { AUDIENCES } from "@/lib/schemas/catalog";
import { STUDENT_STATUSES } from "@/lib/schemas/people";
import { createClient } from "@/lib/supabase/server";

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((a) => a === value);
}

export default async function StudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; audience?: string; status?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const sp = await searchParams;
  const search = typeof sp.search === "string" ? sp.search.slice(0, 80) : "";
  const audience: AudienceSegment | undefined = pick(sp.audience, AUDIENCES);
  const status: StudentStatus | undefined = pick(sp.status, STUDENT_STATUSES);

  const t = await getTranslations({ locale, namespace: "students" });
  const te = await getTranslations({ locale, namespace: "enums" });
  const students = await listStudents(await createClient(), { search, audience, status });
  const href = (id: string) => `/${locale}/admin/students/${id}`;

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
            <Link href={`/${locale}/admin/students/new`} className={buttonLinkClass}>
              {t("new.title")}
            </Link>
          </div>
        }
      />

      {/* Filtros en la URL (GET): funcionan sin JS y se pueden compartir. */}
      <form method="get" role="search" aria-label={t("filters.label")} className="mt-8 grid gap-4 rounded-md border border-line bg-surface p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
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
        <Button type="submit" variant="secondary">{t("filters.apply")}</Button>
      </form>

      <p role="status" className="mt-4 text-sm text-text-muted">
        {t("count", { count: students.length })}
      </p>

      {students.length === 0 ? null : (
        <>
          <table className={`mt-4 hidden md:table ${tableClass}`}>
            <caption className="sr-only">{t("title")}</caption>
            <thead>
              <tr>
                <th scope="col" className={thClass}>{t("columns.name")}</th>
                <th scope="col" className={thClass}>{t("columns.audience")}</th>
                <th scope="col" className={thClass}>{t("columns.status")}</th>
                <th scope="col" className={thClass}>{t("columns.portal")}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <th scope="row" className={tdClass}>
                    <Link href={href(s.id)} className={linkClass}>{s.full_name}</Link>
                  </th>
                  <td className={tdClass}>{te(`audience.${s.audience}`)}</td>
                  <td className={tdClass}>{te(`studentStatus.${s.status}`)}</td>
                  <td className={tdClass}>
                    {s.is_minor ? t("portal.minor") : s.profile_id ? t("portal.yes") : t("portal.no")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mt-4 flex flex-col gap-3 md:hidden">
            {students.map((s) => (
              <li key={s.id} className="rounded-md border border-line bg-surface p-4">
                <Link href={href(s.id)} className={`${linkClass} inline-flex min-h-11 items-center`}>
                  {s.full_name}
                </Link>
                <p className="text-sm text-text-muted">
                  {te(`audience.${s.audience}`)} · {te(`studentStatus.${s.status}`)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
