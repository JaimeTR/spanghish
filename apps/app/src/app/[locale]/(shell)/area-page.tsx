import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import type { AppRole } from "@/lib/access";
import { requireArea } from "@/lib/require-area";

/** Página provisional de cada zona por rol; comprueba el rol en el servidor. */
export async function AreaPage({
  params,
  area,
}: {
  params: Promise<{ locale: string }>;
  area: AppRole;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, area);
  const t = await getTranslations({ locale, namespace: "areas" });

  return (
    <>
      <h1 className="text-3xl font-bold text-structure">{t(area)}</h1>
      <p className="mt-2 text-text-muted">{t("placeholder")}</p>
    </>
  );
}
