import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const user = await getSessionUser();
  if (!user) notFound();
  const t = await getTranslations("account");
  const ta = await getTranslations("areas");
  const { data } = await (await createClient()).auth.getUser();
  const rows: [string, string][] = [
    [t("name"), user.name ?? "—"],
    [t("email"), data.user?.email ?? "—"],
    [t("roles"), user.roles.map((role) => ta(role)).join(", ")],
  ];

  return (
    <section aria-labelledby="account-title" className="max-w-2xl">
      <h1 id="account-title" className="font-display text-3xl text-structure">
        {t("title")}
      </h1>
      <p className="mt-2 text-text-muted">{t("intro")}</p>
      <dl className="mt-8 divide-y divide-line rounded-lg border border-line bg-surface">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
            <dt className="text-sm font-semibold text-text-muted">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
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
