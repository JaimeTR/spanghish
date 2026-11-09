import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { isLocale } from "@/i18n/routing";
import { requireArea } from "@/lib/require-area";
import { InviteTeacherForm } from "./InviteTeacherForm";

export default async function NewTeacherPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireArea(locale, "admin");
  const t = await getTranslations({ locale, namespace: "teachers.new" });

  return (
    <>
      <PageHeader
        title={t("title")}
        intro={t("intro")}
        back={{ href: `/${locale}/admin/teachers`, label: t("back") }}
      />
      <InviteTeacherForm locale={locale} />
    </>
  );
}
