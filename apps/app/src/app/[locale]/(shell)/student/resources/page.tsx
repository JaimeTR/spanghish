import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ResourceCard } from "@/components/content/ResourceCard";
import { isLocale } from "@/i18n/routing";
import { listPortalResources } from "@/lib/data/content";
import { createClient } from "@/lib/supabase/server";
import { requireArea } from "@/lib/require-area";

const tiers = ["public", "account", "enrolled"] as const;

export default async function StudentResourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params; if (!isLocale(rawLocale)) notFound(); const locale = rawLocale;
  setRequestLocale(locale); await requireArea(locale, "student");
  const [t, supabase] = await Promise.all([getTranslations({ locale, namespace: "studentContent.resources" }), createClient()]);
  const [{ data: tier, error: tierError }, resources] = await Promise.all([supabase.rpc("content_tier"), listPortalResources(supabase)]);
  if (tierError) throw new Error(`content_tier: ${tierError.code}`);
  const tierNames = { public: t("accessTiers.public"), account: t("accessTiers.account"), enrolled: t("accessTiers.enrolled") };
  return <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
    <header className="rounded-[var(--shape-lg)] bg-structure p-6 text-on-structure"><p className="text-sm font-semibold">{t("eyebrow")}</p><h1 className="mt-1 text-3xl font-extrabold">{t("title")}</h1><p className="mt-3 text-lg">{t("yourAccess", { tier: tierNames[tier ?? "public"] })}</p></header>
    <div className="mt-8 space-y-10">{tiers.map((level) => { const rows = resources.filter((item) => item.accessLevel === level); return <section key={level} aria-labelledby={`resources-${level}`}>
      <h2 id={`resources-${level}`} className="mb-4 text-2xl font-extrabold text-structure">{t(`tiers.${level}`)}</h2>
      {rows.length ? <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">{rows.map((resource) => <li key={resource.id}><ResourceCard resource={resource} locale={locale} /></li>)}</ul> : <p className="rounded-xl bg-surface-sunken p-4 text-text-muted">{t("empty")}</p>}
    </section>; })}</div>
  </div>;
}
