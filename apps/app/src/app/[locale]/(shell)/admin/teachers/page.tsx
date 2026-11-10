import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonLinkClass, Notice, PageHeader, StatusBadge, TableCard, tableClass, tdClass, thClass } from "@/components/admin/PageHeader";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { listStaff } from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { InviteTeacherForm } from "./new/InviteTeacherForm";
import { SuspendForm } from "./SuspendForm";

export default async function TeachersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ invited?: string; new?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const { invited, new: openNew } = await searchParams;

  const t = await getTranslations({ locale, namespace: "teachers" });
  const ta = await getTranslations({ locale, namespace: "areas" });
  const staff = await listStaff(await createClient());

  const rolesOf = (roles: string[]) =>
    roles
      .filter((r) => r === "admin" || r === "teacher")
      .map((r) => ta(r as "admin" | "teacher"))
      .join(", ");
  const badge = (status: "active" | "suspended") => (
    <StatusBadge tone={status === "active" ? "success" : "muted"}>{t(`status.${status}`)}</StatusBadge>
  );

  return (
    <>
      <PageHeader
        title={t("title")}
        intro={t("intro")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ModalButton label={t("invite")} title={t("new.title")} size="md" defaultOpen={openNew === "1"}>
              <p className="mb-5 text-sm text-text-muted">{t("new.intro")}</p>
              <InviteTeacherForm locale={locale} />
            </ModalButton>
            <Link href={`/${locale}/admin/teachers/profiles`} className={buttonLinkClass}>
              {locale === "es" ? "Perfiles públicos" : "Public profiles"}
            </Link>
          </div>
        }
      />

      {invited === "sent" ? <Notice>{t("invited.sent")}</Notice> : null}
      {invited === "nomail" ? <Notice tone="warning">{t("invited.nomail")}</Notice> : null}

      {staff.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("empty")}</p>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <TableCard>
            <table className={tableClass}>
              <caption className="sr-only">{t("title")}</caption>
              <thead>
                <tr>
                  <th scope="col" className={thClass}>{t("columns.name")}</th>
                  <th scope="col" className={thClass}>{t("columns.email")}</th>
                  <th scope="col" className={thClass}>{t("columns.roles")}</th>
                  <th scope="col" className={thClass}>{t("columns.status")}</th>
                  <th scope="col" className={`${thClass} text-right`}>{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-sunken/40">
                    <th scope="row" className={`${tdClass} font-semibold`}>{m.fullName ?? t("noName")}</th>
                    <td className={tdClass}>{m.email}</td>
                    <td className={tdClass}>{rolesOf(m.roles)}</td>
                    <td className={tdClass}>{badge(m.status)}</td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex justify-end">
                        <SuspendForm locale={locale} userId={m.id} suspended={m.status === "suspended"} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          {/* Móvil: lista */}
          <ul className="mt-6 flex flex-col gap-3 md:hidden">
            {staff.map((m) => (
              <li key={m.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-text">{m.fullName ?? t("noName")}</p>
                    <p className="text-sm break-all text-text-muted">{m.email}</p>
                    <p className="mt-1 text-sm text-text">{rolesOf(m.roles)}</p>
                  </div>
                  {badge(m.status)}
                </div>
                <div className="mt-2 flex justify-end border-t border-line pt-2">
                  <SuspendForm locale={locale} userId={m.id} suspended={m.status === "suspended"} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
