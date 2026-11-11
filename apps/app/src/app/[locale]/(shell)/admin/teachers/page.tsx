import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type DataColumn, type DataRow } from "@/components/admin/DataTable";
import { buttonLinkClass, Notice, PageHeader, StatusBadge } from "@/components/admin/PageHeader";
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

  const columns: DataColumn[] = [
    { id: "name", header: t("columns.name"), sortable: true, rowHeader: true },
    { id: "email", header: t("columns.email"), sortable: true },
    {
      id: "roles",
      header: t("columns.roles"),
      sortable: true,
      filter: { options: (["admin", "teacher"] as const).map((r) => ({ value: r, label: ta(r) })) },
    },
    {
      id: "status",
      header: t("columns.status"),
      sortable: true,
      filter: { options: (["active", "suspended"] as const).map((v) => ({ value: v, label: t(`status.${v}`) })) },
    },
    { id: "actions", header: t("columns.actions"), align: "right" },
  ];
  const rows: DataRow[] = staff.map((m) => {
    const suspend = <SuspendForm locale={locale} userId={m.id} suspended={m.status === "suspended"} />;
    return {
      id: m.id,
      // Un filtro de rol por el rol principal: admin si lo tiene.
      values: {
        name: m.fullName ?? t("noName"),
        email: m.email ?? "",
        roles: m.roles.includes("admin") ? "admin" : "teacher",
        status: m.status,
      },
      searchText: `${m.fullName ?? ""} ${m.email ?? ""}`,
      cells: {
        name: m.fullName ?? t("noName"),
        email: m.email,
        roles: rolesOf(m.roles),
        status: badge(m.status),
        actions: <div className="flex justify-end">{suspend}</div>,
      },
      card: (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-text">{m.fullName ?? t("noName")}</p>
              <p className="text-sm break-all text-text-muted">{m.email}</p>
              <p className="mt-1 text-sm text-text">{rolesOf(m.roles)}</p>
            </div>
            {badge(m.status)}
          </div>
          <div className="mt-2 flex justify-end border-t border-line pt-2">{suspend}</div>
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
        <DataTable caption={t("title")} columns={columns} rows={rows} searchLabel={t("search")} defaultSort={{ id: "name" }} />
      )}
    </>
  );
}
