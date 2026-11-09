import { getTranslations } from "next-intl/server";
import { Section } from "@/components/admin/PageHeader";
import type { Locale } from "@/i18n/routing";
import type { LocationRow, PriceRow, ProgramWithEditions } from "@/lib/data/catalog";
import { formatAud } from "@/lib/money";
import { resolvePrices } from "@/lib/pricing";
import { DeactivatePriceForm, PriceForm } from "./PriceForms";

/** Precios del programa: vigentes por edición, lista de precios activos, alta y anteriores. */
export async function PricesSection({
  locale,
  program,
  locations,
}: {
  locale: Locale;
  program: ProgramWithEditions;
  locations: LocationRow[];
}) {
  const t = await getTranslations({ locale, namespace: "catalog.prices" });
  const te = await getTranslations({ locale, namespace: "enums" });
  const editionName = new Map(
    program.program_editions.map((e) => [e.id, (locale === "en" ? e.label_en : e.label_es) ?? e.starts_on]),
  );
  const locationName = new Map(locations.map((l) => [l.id, l.name]));

  const describe = (p: PriceRow) => {
    const what =
      p.kind === "pack"
        ? t("packOf", { lessons: p.lessons_included ?? 0 })
        : p.kind === "upfront" && p.lessons_included
          ? `${te("priceKind.upfront")} (${t("lessonsCount", { lessons: p.lessons_included })})`
          : te(`priceKind.${p.kind}`);
    const label = locale === "en" ? p.label_en : p.label_es;
    return `${formatAud(p.amount_cents)} · ${what}${label ? ` · ${label}` : ""}`;
  };
  const scope = (p: PriceRow) => {
    const parts = [
      p.edition_id ? editionName.get(p.edition_id) : null,
      p.location_id ? locationName.get(p.location_id) : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : t("wholeProgram");
  };

  const active = program.program_prices.filter((p) => p.active);
  const inactive = program.program_prices.filter((p) => !p.active);

  return (
    <Section id="program-prices" title={t("title")}>
      {program.program_editions.length > 0 ? (
        <div className="mb-6">
          <h3 className="mb-2 font-semibold text-text">{t("effective")}</h3>
          <ul className="space-y-1 text-sm">
            {program.program_editions.map((e) => {
              const prices = resolvePrices(program.program_prices, {
                programId: program.id,
                editionId: e.id,
                locationId: null,
              });
              return (
                <li key={e.id}>
                  <span className="font-semibold">{editionName.get(e.id)}:</span>{" "}
                  {prices.length > 0 ? prices.map(describe).join(" — ") : t("none")}
                </li>
              );
            })}
          </ul>
          <p className="mt-1 text-sm text-text-muted">{t("effectiveHint")}</p>
        </div>
      ) : null}

      <h3 className="mb-2 font-semibold text-text">{t("active")}</h3>
      {active.length === 0 ? (
        <p className="text-text-muted">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {active.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-text">{describe(p)}</p>
                <p className="text-sm text-text-muted">{scope(p)}</p>
              </div>
              <DeactivatePriceForm
                locale={locale}
                programId={program.id}
                priceId={p.id}
                description={`${describe(p)}, ${scope(p)}`}
              />
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 mb-3 font-semibold text-text">{t("new")}</h3>
      <PriceForm
        locale={locale}
        programId={program.id}
        editions={program.program_editions.map((e) => ({ value: e.id, label: editionName.get(e.id) ?? e.starts_on }))}
        locations={locations.filter((l) => l.active).map((l) => ({ value: l.id, label: l.name }))}
      />

      {inactive.length > 0 ? (
        <details className="mt-6">
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary">
            {t("previous", { count: inactive.length })}
          </summary>
          <ul className="mt-2 space-y-1 text-sm text-text-muted">
            {inactive.map((p) => (
              <li key={p.id}>
                {describe(p)} · {scope(p)}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Section>
  );
}
