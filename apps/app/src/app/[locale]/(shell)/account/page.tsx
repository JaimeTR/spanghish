import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { AvatarUploader } from "./AvatarUploader";
import { ProfileForm } from "./ProfileForm";

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const user = await getSessionUser();
  if (!user) notFound();
  const t = await getTranslations("account");
  const ta = await getTranslations("areas");

  const { data: profile } = await (await createClient())
    .from("profiles")
    .select("full_name, email, phone, birth_date, address, city, country, preferred_locale, avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) notFound();

  return (
    <section aria-labelledby="account-title" className="max-w-2xl">
      <h1 id="account-title" className="font-display text-3xl text-structure">
        {t("title")}
      </h1>
      <p className="mt-2 text-text-muted">{t("intro")}</p>

      <div className="mt-8 rounded-lg border border-line bg-surface p-5">
        <h2 className="mb-4 text-base font-semibold text-text">{t("avatar.title")}</h2>
        <AvatarUploader locale={locale} name={profile.full_name ?? profile.email} initialPath={profile.avatar_path} />
      </div>

      <dl className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
          <dt className="text-sm font-semibold text-text-muted">{t("email")}</dt>
          <dd className="min-w-0 break-words">
            {profile.email ?? "—"}
            <span className="mt-1 block text-sm text-text-muted">{t("emailHint")}</span>
          </dd>
        </div>
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
          <dt className="text-sm font-semibold text-text-muted">{t("roles")}</dt>
          <dd className="min-w-0 break-words">{user.roles.map((role) => ta(role)).join(", ")}</dd>
        </div>
      </dl>

      <h2 className="mt-10 text-xl font-bold text-text">{t("form.title")}</h2>
      <div className="mt-4 rounded-lg border border-line bg-surface p-5">
        <ProfileForm locale={locale} profile={profile} />
      </div>

      <p className="mt-6">
        <Link
          href={`/${locale}/forgot-password`}
          className="font-semibold text-primary underline underline-offset-4 hover:text-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
        >
          {t("changePassword")}
        </Link>
      </p>
    </section>
  );
}
