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
import { listUsers } from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { APP_ROLES } from "@/lib/schemas/people";
import { createClient } from "@/lib/supabase/server";
import { SuspendForm } from "../teachers/SuspendForm";
import { InviteUserForm } from "./InviteUserForm";

export default async function UsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const me = await requireArea(locale, "admin");
  const query = await searchParams;
  const [t, ta, users] = await Promise.all([
    getTranslations({ locale, namespace: "users" }),
    getTranslations({ locale, namespace: "areas" }),
    createClient().then(listUsers),
  ]);
  const href = (id: string) => `/${locale}/admin/users/${id}`;
  const rolesLabel = (roles: string[]) => APP_ROLES.filter((r) => roles.includes(r)).map((r) => ta(r)).join(", ");

  const columns: DataColumn[] = [
    { id: "name", header: t("columns.name"), sortable: true, rowHeader: true },
    { id: "email", header: t("columns.email"), sortable: true },
    { id: "phone", header: t("columns.phone") },
    {
      id: "roles",
      header: t("columns.roles"),
      filter: { multi: true, options: APP_ROLES.map((r) => ({ value: r, label: ta(r) })) },
    },
    {
      id: "status",
      header: t("columns.status"),
      sortable: true,
      filter: { options: (["active", "suspended"] as const).map((s) => ({ value: s, label: t(`status.${s}`) })) },
    },
    { id: "actions", header: t("columns.actions"), align: "right" },
  ];

  const rows: DataRow[] = users.map((u) => {
    const name = u.fullName ?? t("noName");
    const badge = <StatusBadge tone={u.status === "active" ? "success" : "muted"}>{t(`status.${u.status}`)}</StatusBadge>;
    const actions = (
      <RowActions>
        <IconLink href={href(u.id)} label={t("edit")} icon={<Pencil className="size-5" strokeWidth={1.75} />} />
        {/* Nadie se suspende a sí misma desde aquí. */}
        {u.id !== me.id ? <SuspendForm locale={locale} userId={u.id} suspended={u.status === "suspended"} /> : null}
      </RowActions>
    );
    return {
      id: u.id,
      values: { name, email: u.email ?? "", phone: u.phone ?? "", roles: u.roles.join(","), status: u.status },
      searchText: `${u.fullName ?? ""} ${u.email ?? ""} ${u.phone ?? ""}`,
      cells: {
        name: <Link href={href(u.id)} className={linkClass}>{name}</Link>,
        email: u.email ?? "—",
        phone: u.phone ?? "—",
        roles: rolesLabel(u.roles) || "—",
        status: badge,
        actions,
      },
      card: (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={href(u.id)} className={`${linkClass} inline-flex min-h-11 items-center`}>
                {name}
              </Link>
              <p className="text-sm break-all text-text-muted">{u.email}</p>
              <p className="text-sm text-text">{rolesLabel(u.roles)}</p>
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
          <ModalButton label={t("new")} title={t("new")} size="md" defaultOpen={query.new === "1"}>
            <p className="mb-5 text-sm text-text-muted">{t("invite.intro")}</p>
            <InviteUserForm locale={locale} />
          </ModalButton>
        }
      />
      {users.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("empty")}</p>
      ) : (
        <DataTable caption={t("title")} columns={columns} rows={rows} searchLabel={t("search")} defaultSort={{ id: "name" }} />
      )}
    </>
  );
}
