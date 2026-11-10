import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { ResourcesPage } from "@/components/resources/ResourcesPage";
import { isLocale } from "@/i18n/routing";
import { getPublicResourceCards } from "@/lib/content-source";
import { crumbsJsonLd, innerPageMetadata, type PageProps } from "@/lib/page-meta";

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "resources", "resources");
}

// Literal: Next lo lee en tiempo de compilación (igual a PLATFORM_REVALIDATE_SECONDS).
export const revalidate = 300;

/**
 * Recursos gratis y niveles de acceso: lo publicado en la plataforma o, si no
 * responde, el respaldo estático. Sin VideoObject en el JSON-LD: faltan
 * datos obligatorios (fecha de subida y descripción) de los videos.
 */
export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const tn = await getTranslations({ locale, namespace: "nav" });
  const crumbs = await crumbsJsonLd(locale, [{ route: "resources", name: tn("resources") }]);
  const { cards } = await getPublicResourceCards();

  return (
    <PageShell locale={locale} route="resources" jsonLd={[crumbs]}>
      <ResourcesPage locale={locale} cards={cards} />
    </PageShell>
  );
}
