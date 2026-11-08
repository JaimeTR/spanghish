import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { ResourcesPage } from "@/components/resources/ResourcesPage";
import { isLocale } from "@/i18n/routing";
import { crumbsJsonLd, innerPageMetadata, type PageProps } from "@/lib/page-meta";

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "resources", "resources");
}

/**
 * Recursos gratis y niveles de acceso. Sin VideoObject en el JSON-LD: faltan
 * datos obligatorios (fecha de subida y descripción) de los videos.
 */
export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const tn = await getTranslations({ locale, namespace: "nav" });
  const crumbs = await crumbsJsonLd(locale, [{ route: "resources", name: tn("resources") }]);

  return (
    <PageShell locale={locale} route="resources" jsonLd={[crumbs]}>
      <ResourcesPage locale={locale} />
    </PageShell>
  );
}
