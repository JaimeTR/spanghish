import { Globe, IdCard, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTable, type DataColumn, type DataRow } from "@/components/admin/DataTable";
import { Notice, PageHeader, RowActions, StatusBadge } from "@/components/admin/PageHeader";
import { linkClass } from "@/components/form-styles";
import { IconLink } from "@/components/ui/IconButton";
import { ModalButton } from "@/components/ui/Modal";
import { isLocale } from "@/i18n/routing";
import { listTeachers } from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { InviteTeacherForm } from "./new/InviteTeacherForm";
import { TeacherProfileForm } from "./profiles/TeacherProfileForm";
import { TeacherProfilePublishButton } from "./profiles/TeacherProfilePublishButton";
import { SuspendForm } from "./SuspendForm";

/** Solo docentes (las cuentas con rol docente); administración y el resto de cuentas están en Usuarios. */
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
  const db = await createClient();
  const [teachers, fichas] = await Promise.all([
    listTeachers(db),
    db.from("teacher_profiles").select("id, profile_id, status"),
  ]);
  // Ficha pública (la que sale en la web) de cada cuenta de docente.
  const ficha = new Map((fichas.data ?? []).filter((f) => f.profile_id).map((f) => [f.profile_id as string, f]));
  const accounts = teachers.filter((m) => m.status === "active").map((m) => ({ id: m.id, name: m.fullName ?? m.email ?? m.id }));
  const href = (id: string) => `/${locale}/admin/users/${id}`;
  const badge = (status: "active" | "suspended") => (
    <StatusBadge tone={status === "active" ? "success" : "muted"}>{t(`status.${status}`)}</StatusBadge>
  );

  const columns: DataColumn[] = [
    { id: "name", header: t("columns.name"), sortable: true, rowHeader: true },
    { id: "email", header: t("columns.email"), sortable: true },
    { id: "phone", header: t("columns.phone") },
    {
      id: "web",
      header: t("columns.web"),
      filter: { options: (["published", "hidden", "none"] as const).map((v) => ({ value: v, label: t(`web.${v}`) })) },
    },
    {
      id: "status",
      header: t("columns.status"),
      sortable: true,
      filter: { options: (["active", "suspended"] as const).map((s) => ({ value: s, label: t(`status.${s}`) })) },
    },
    { id: "actions", header: t("columns.actions"), align: "right" },
  ];

  const rows: DataRow[] = teachers.map((m) => {
    const name = m.fullName ?? t("noName");
    const f = ficha.get(m.id);
    const web = f ? (f.status === "published" ? "published" : "hidden") : "none";
    const webBadge = <StatusBadge tone={web === "published" ? "success" : "muted"}>{t(`web.${web}`)}</StatusBadge>;
    const actions = (
      <RowActions>
        {f ? (
          <>
            <TeacherProfilePublishButton id={f.id} locale={locale} published={f.status === "published"} />
            <IconLink href={`/${locale}/admin/teachers/profiles/${f.id}`} label={t("editWeb")} icon={<IdCard className="size-5" strokeWidth={1.75} />} />
          </>
        ) : (
          <ModalButton iconOnly label={t("createWeb")} title={t("createWeb")} icon={<Globe className="size-5" strokeWidth={1.75} />} size="xl">
            <TeacherProfileForm locale={locale} teachers={accounts} defaults={{ profileId: m.id, name: m.fullName ?? "" }} />
          </ModalButton>
        )}
        <IconLink href={href(m.id)} label={t("edit")} icon={<Pencil className="size-5" strokeWidth={1.75} />} />
        <SuspendForm locale={locale} userId={m.id} suspended={m.status === "suspended"} />
      </RowActions>
    );
    return {
      id: m.id,
      values: { name, email: m.email ?? "", phone: m.phone ?? "", web, status: m.status },
      searchText: `${m.fullName ?? ""} ${m.email ?? ""} ${m.phone ?? ""}`,
      cells: {
        name: <Link href={href(m.id)} className={linkClass}>{name}</Link>,
        email: m.email ?? "—",
        phone: m.phone ?? "—",
        web: webBadge,
        status: badge(m.status),
        actions,
      },
      card: (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={href(m.id)} className={`${linkClass} inline-flex min-h-11 items-center`}>
                {name}
              </Link>
              <p className="text-sm break-all text-text-muted">{m.email}</p>
              {m.phone ? <p className="text-sm text-text-muted">{m.phone}</p> : null}
              <p className="mt-1 text-xs text-text-muted">{t("columns.web")}: {t(`web.${web}`)}</p>
            </div>
            {badge(m.status)}
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
          <ModalButton label={t("invite")} title={t("new.title")} size="md" defaultOpen={openNew === "1"}>
            <p className="mb-5 text-sm text-text-muted">{t("new.intro")}</p>
            <InviteTeacherForm locale={locale} />
          </ModalButton>
        }
      />

      {invited === "sent" ? <Notice>{t("invited.sent")}</Notice> : null}
      {invited === "nomail" ? <Notice tone="warning">{t("invited.nomail")}</Notice> : null}

      {teachers.length === 0 ? (
        <p className="mt-8 text-text-muted">{t("empty")}</p>
      ) : (
        <DataTable caption={t("title")} columns={columns} rows={rows} searchLabel={t("search")} defaultSort={{ id: "name" }} />
      )}
    </>
  );
}
