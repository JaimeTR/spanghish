import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { listLevels } from "@/lib/data/content";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { ResourceForm } from "../ResourceForm";
export default async function NewResourcePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); await requireArea(locale, "admin");
  const [t, levels] = await Promise.all([getTranslations({ locale, namespace: "content.resources" }), createClient().then((db) => listLevels(db))]);
  return <><PageHeader title={t("new")} back={{ href: `/${locale}/admin/resources`, label: t("back") }} /><ResourceForm locale={locale} levels={levels} /></>;
}
