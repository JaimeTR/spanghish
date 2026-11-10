import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { linkClass } from "@/components/form-styles";
import { isLocale } from "@/i18n/routing";
import { ResetForm } from "./reset-form";

// El token va en la URL: que no salga en la cabecera Referer.
export const metadata: Metadata = { referrer: "no-referrer" };

/**
 * GET solo pinta el formulario con el token_hash oculto; el token se verifica
 * al enviar (updatePassword), así abrir el enlace no lo gasta.
 */
export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "reset" });
  const tl = await getTranslations({ locale, namespace: "login" });

  const query = await searchParams;
  const tokenHash = typeof query.token_hash === "string" ? query.token_hash : "";
  const type = typeof query.type === "string" ? query.type : "recovery";
  const usable = type === "recovery" && tokenHash.length >= 10 && tokenHash.length <= 512;

  return (
    <>
      <AuthHeader eyebrow={tl("eyebrow")} title={t("title")} intro={usable ? t("intro") : undefined} />
      {usable ? (
        <ResetForm locale={locale} tokenHash={tokenHash} />
      ) : (
        <>
          <p className="mt-2 font-semibold text-danger">{t("errors.expired")}</p>
          <p className="mt-4 text-sm">
            <a href={`/${locale}/forgot-password`} className={linkClass}>
              {t("requestNew")}
            </a>
          </p>
        </>
      )}
    </>
  );
}
