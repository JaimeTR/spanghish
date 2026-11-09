import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, Section } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { listLocations } from "@/lib/data/catalog";
import { requireArea } from "@/lib/require-area";
import { createClient } from "@/lib/supabase/server";
import { LocationForm } from "./LocationForm";

export default async function LocationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "catalog" });
  const te = await getTranslations({ locale, namespace: "enums" });
  const locations = await listLocations(await createClient());

  return (
    <>
      <PageHeader
        title={t("locations.title")}
        intro={t("locations.intro")}
        back={{ href: `/${locale}/admin/catalog`, label: t("title") }}
      />

      <Section id="new-location" title={t("locations.new")}>
        <LocationForm locale={locale} />
      </Section>

      <Section id="location-list" title={t("locations.list")}>
        {locations.length === 0 ? (
          <p className="text-text-muted">{t("locations.empty")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {locations.map((l) => (
              <li key={l.id} className="py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-text">{l.name}</h3>
                  <p className="text-sm text-text-muted">
                    {te(`locationKind.${l.kind}`)} · {te(`region.${l.region as "brisbane"}`)} ·{" "}
                    {l.active ? t("active") : t("inactive")}
                  </p>
                </div>
                {l.address ? <p className="text-sm text-text">{l.address}</p> : null}
                <details className="mt-2">
                  <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary">
                    {t("edit")}
                    <span className="sr-only"> {l.name}</span>
                  </summary>
                  <div className="mt-3">
                    <LocationForm locale={locale} location={l} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
