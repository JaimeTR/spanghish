import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("home");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-3 p-6">
      <h1 className="text-3xl font-bold text-structure">{t("title")}</h1>
      <p className="text-text-muted">{t("placeholder")}</p>
    </main>
  );
}
