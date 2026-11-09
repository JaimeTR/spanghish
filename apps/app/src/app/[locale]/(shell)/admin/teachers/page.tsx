import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonLinkClass, Notice, PageHeader, tableClass, tdClass, thClass } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { listStaff } from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { SuspendForm } from "./SuspendForm";

export default async function TeachersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ invited?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const { invited } = await searchParams;

  const t = await getTranslations({ locale, namespace: "teachers" });
  const ta = await getTranslations({ locale, namespace: "areas" });
  const staff = await listStaff(await createClient());

  const rolesOf = (roles: string[]) =>
    roles
      .filter((r) => r === "admin" || r === "teacher")
      .map((r) => ta(r as "admin" | "teacher"))
      .join(", ");

  return (
    <>
      <PageHeader
        title={t("title")}
        intro={t("intro")}
        action={
          <Link href={`/${locale}/admin/teachers/new`} className={buttonLinkClass}>
            {t("invite")}
          </Link>
        }
      />

      {invited === "sent" ? <Notice>{t("invited.sent")}</Notice> : null}
      {invited === "nomail" ? <Notice tone="warning">{t("invited.nomail")}</Notice> : null}

      {staff.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("empty")}</p>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <table className={`mt-8 hidden md:table ${tableClass}`}>
            <caption className="sr-only">{t("title")}</caption>
            <thead>
              <tr>
                <th scope="col" className={thClass}>{t("columns.name")}</th>
                <th scope="col" className={thClass}>{t("columns.email")}</th>
                <th scope="col" className={thClass}>{t("columns.roles")}</th>
                <th scope="col" className={thClass}>{t("columns.status")}</th>
                <th scope="col" className={thClass}>{t("columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((m) => (
                <tr key={m.id}>
                  <th scope="row" className={`${tdClass} font-semibold`}>{m.fullName ?? t("noName")}</th>
                  <td className={tdClass}>{m.email}</td>
                  <td className={tdClass}>{rolesOf(m.roles)}</td>
                  <td className={tdClass}>{t(`status.${m.status}`)}</td>
                  <td className={tdClass}>
                    <SuspendForm
                      locale={locale}
                      userId={m.id}
                      name={m.fullName ?? m.email ?? ""}
                      suspended={m.status === "suspended"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Móvil: lista */}
          <ul className="mt-6 flex flex-col gap-3 md:hidden">
            {staff.map((m) => (
              <li key={m.id} className="rounded-md border border-line bg-surface p-4">
                <p className="font-semibold text-text">{m.fullName ?? t("noName")}</p>
                <p className="text-sm break-all text-text-muted">{m.email}</p>
                <p className="mt-1 text-sm text-text">
                  {rolesOf(m.roles)} · {t(`status.${m.status}`)}
                </p>
                <div className="mt-3">
                  <SuspendForm
                    locale={locale}
                    userId={m.id}
                    name={m.fullName ?? m.email ?? ""}
                    suspended={m.status === "suspended"}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
