import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { getAdminResource, listLevels } from "@/lib/data/content";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { ResourceForm } from "../ResourceForm";
import { FileUpload } from "@/components/content/FileUpload";
import { ResourceDeleteButton } from "../ResourceDeleteButton";
export default async function EditResourcePage({ params }: { params: Promise<{ locale: string; resourceId: string }> }) {
  const { locale, resourceId } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); await requireArea(locale, "admin");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(resourceId)) notFound();
  const db = await createClient(); const [resource, levels, t] = await Promise.all([getAdminResource(db, resourceId), listLevels(db), getTranslations({ locale, namespace: "content.resources" })]);
  if (!resource) notFound();
  return <><PageHeader title={locale === "es" ? resource.title_es : resource.title_en} back={{ href: `/${locale}/admin/resources`, label: t("back") }} />
    {resource.access_level !== "public" ? <aside className="my-5 rounded border border-line p-4"><h2 className="font-semibold">{t("preview")}</h2><p>{resource.teaser_public ? (locale === "es" ? resource.description_es : resource.description_en) : t("locked")}</p><span>{locale === "es" ? resource.title_es : resource.title_en}</span></aside> : null}
    <ResourceForm locale={locale} resource={resource} levels={levels} />
    <div className="mt-8 rounded border border-line p-5"><h2 className="font-semibold">{t("file")}</h2><FileUpload ownerId={resource.id} target="resourceFile" locale={locale} accept="application/pdf,image/png,image/jpeg,audio/mpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation" maxBytes={26_214_400} currentLabel={resource.file_path ? `${resource.file_path.split("/").at(-1)} · ${resource.file_size_bytes ? Math.ceil(resource.file_size_bytes / 1024) : 0} KB` : undefined} allowRemove /></div>
    <div className="mt-8 rounded border border-line p-5"><h2 className="font-semibold">{t("thumbnail")}</h2><FileUpload ownerId={resource.id} target="thumbnail" locale={locale} accept="image/png,image/jpeg,image/webp" maxBytes={2_097_152} currentLabel={resource.thumbnail_path ?? undefined} /></div>
    <ResourceDeleteButton id={resource.id} locale={locale} />
  </>;
}
