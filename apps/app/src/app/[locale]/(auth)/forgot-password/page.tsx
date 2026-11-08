import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
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

  return (
    <>
      <h1 className="text-2xl font-bold text-structure">{t("title")}</h1>
      <p className="mt-2 text-text-muted">{t("intro")}</p>
      <ForgotForm locale={locale} />
    </>
  );
}
