import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { linkClass } from "@/components/form-styles";
import { isLocale } from "@/i18n/routing";
import { webUrl } from "@/lib/web-url";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const { next, error } = await searchParams;
  const t = await getTranslations({ locale, namespace: "login" });
  const contact = webUrl(locale, "contact-us");

  return (
    <>
      <AuthHeader eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <LoginForm
        locale={locale}
        // El destino se valida en el servidor (isSafeRedirect + canAccess).
        next={typeof next === "string" ? next : ""}
        initialError={error === "suspended" ? "suspended" : undefined}
      />
      {/* Las cuentas las crea la escuela: no hay registro público. */}
      <p className="mt-7 border-t border-line pt-5 text-sm text-text-muted">
        {t("noAccount")}{" "}
        {contact && (
          <a href={contact} className={linkClass}>
            {t("requestAccess")}
          </a>
        )}
      </p>
    </>
  );
}
