import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Notice, PageHeader, Section, StatusBadge } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { getUserDetail } from "@/lib/data/people";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { formatInstant } from "@/lib/time";
import { AvatarUploader } from "../../../account/AvatarUploader";
import { ProfileForm } from "../../../account/ProfileForm";
import { SuspendForm } from "../../teachers/SuspendForm";
import { RolesForm } from "./RolesForm";

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; userId: string }>;
  searchParams: Promise<{ invited?: string }>;
}) {
  const { locale, userId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const me = await requireArea(locale, "admin");
  const { invited } = await searchParams;
  const user = await getUserDetail(await createClient(), userId);
  if (!user) notFound();
  const t = await getTranslations({ locale, namespace: "users" });
  const roles = user.user_roles.map((r) => r.role);
  const isMe = user.id === me.id;
  const active = user.status === "active";

  return (
    <>
      <PageHeader
        title={user.full_name ?? t("noName")}
        intro={[user.email, formatInstant(user.created_at, locale)].filter(Boolean).join(" · ")}
        back={{ href: `/${locale}/admin/users`, label: t("back") }}
        action={<StatusBadge tone={active ? "success" : "muted"}>{t(`status.${user.status}`)}</StatusBadge>}
      />

      {invited === "sent" ? <Notice>{t("invite.sent")}</Notice> : null}
      {invited === "nomail" ? <Notice tone="warning">{t("invite.nomail")}</Notice> : null}

      <Section id="user-data" title={t("sections.data")}>
        <div className="mb-6">
          <AvatarUploader locale={locale} userId={user.id} name={user.full_name ?? user.email} initialPath={user.avatar_path} />
        </div>
        <p className="mb-4 text-sm text-text-muted">{t("emailFixed", { email: user.email ?? "—" })}</p>
        <ProfileForm locale={locale} userId={user.id} profile={user} />
      </Section>

      <Section id="user-roles" title={t("sections.roles")}>
        <RolesForm locale={locale} userId={user.id} roles={roles} />
      </Section>

      <Section id="user-status" title={t("sections.status")}>
        {isMe ? (
          <p className="text-text-muted">{t("statusSelf")}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <p className="max-w-[60ch] text-text-muted">{active ? t("statusActiveHelp") : t("statusSuspendedHelp")}</p>
            <SuspendForm locale={locale} userId={user.id} suspended={!active} />
          </div>
        )}
      </Section>
    </>
  );
}
