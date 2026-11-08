import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
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

  return (
    <>
      <h1 className="text-2xl font-bold text-structure">{t("title")}</h1>
      <p className="mt-2 text-text-muted">{t("intro")}</p>
      <LoginForm
        locale={locale}
        // El destino se valida en el servidor (isSafeRedirect + canAccess).
        next={typeof next === "string" ? next : ""}
        initialError={error === "suspended" ? "suspended" : undefined}
      />
    </>
  );
}
