import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, Section, StatusBadge } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { healthReport } from "@/lib/health";
import { requireArea } from "@/lib/require-area";

export const dynamic = "force-dynamic";

/**
 * Ajustes del sistema (solo administración): estado de la conexión con la base
 * de datos y de lo que el portal necesita para enviar correos y crear cuentas.
 * Solo muestra si cada cosa está configurada, nunca sus valores.
 */
export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "systemSettings" });
  const health = await healthReport();

  const checks: { label: string; hint: string; ok: boolean; detail?: string }[] = [
    {
      label: t("db.label"),
      hint: t("db.hint"),
      ok: health.db === "ok",
      detail: health.db === "ok" ? t("db.ok") : health.db === "not_configured" ? t("db.notConfigured") : t("db.unreachable"),
    },
    {
      label: t("accounts.label"),
      hint: t("accounts.hint"),
      ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    {
      label: t("resetLink.label"),
      hint: t("resetLink.hint"),
      ok: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    },
    {
      label: t("web.label"),
      hint: t("web.hint"),
      ok: Boolean(process.env.WEB_REVALIDATE_URL && process.env.WEB_REVALIDATE_SECRET),
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />

      <Section id="system-status" title={t("status")}>
        <ul className="divide-y divide-line">
          {checks.map((c) => (
            <li key={c.label} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-text">{c.label}</p>
                <p className="text-sm text-text-muted">{c.hint}</p>
              </div>
              <StatusBadge tone={c.ok ? "success" : "warning"}>{c.detail ?? (c.ok ? t("configured") : t("missing"))}</StatusBadge>
            </li>
          ))}
          <li className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-semibold text-text">{t("version.label")}</p>
              <p className="text-sm text-text-muted">{t("version.hint")}</p>
            </div>
            <span className="font-mono text-sm text-text">{health.commit ?? t("version.local")}</span>
          </li>
        </ul>
      </Section>

      <Section id="system-email" title={t("email.title")}>
        <p className="max-w-[65ch] text-text-muted">{t("email.body")}</p>
      </Section>
    </>
  );
}
