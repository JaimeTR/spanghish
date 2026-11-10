import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { ForgotForm } from "./forgot-form";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "forgot" });
  const tl = await getTranslations({ locale, namespace: "login" });

  return (
    <>
      <AuthHeader eyebrow={tl("eyebrow")} title={t("title")} intro={t("intro")} />
      <ForgotForm locale={locale} />
    </>
  );
}
