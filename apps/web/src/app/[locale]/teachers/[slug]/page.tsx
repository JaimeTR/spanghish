import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/PageShell";
import { TeacherProfile } from "@/components/TeacherProfile";
import { isLocale, routing } from "@/i18n/routing";
import { localePath } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, teacherJsonLd } from "@/lib/structured-data";
import { teacherPath } from "@/lib/teachers";
import { loadTeacher, loadTeacherSlugs } from "@/lib/teachers-source";

type Props = { params: Promise<{ locale: string; slug: string }> };

/** Una docente nueva publicada en la administración aparece sin volver a desplegar. */
export const dynamicParams = true;
// Literal: Next lo lee en tiempo de compilación (igual a PLATFORM_REVALIDATE_SECONDS).
export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await loadTeacherSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const teacher = await loadTeacher(locale, slug);
  if (!teacher) return {};
  const t = await getTranslations({ locale, namespace: "page.teachers" });
  const tm = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    route: "teachers",
    subpath: teacher.slug,
    title: t("profileMetaTitle", { name: teacher.name }),
    description: teacher.metaDescription,
    ogAlt: tm("ogAlt"),
  });
}

export default async function TeacherPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const teacher = await loadTeacher(locale, slug);
  if (!teacher) notFound();

  const t = await getTranslations({ locale, namespace: "page.teachers" });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const path = teacherPath(locale, teacher.slug);

  return (
    <PageShell
      locale={locale}
      route="teachers"
      jsonLd={[
        teacherJsonLd(path, teacher.metaDescription, teacher.role, teacher.name),
        breadcrumbJsonLd([
          { name: tn("homeCrumb"), path: localePath(locale, "home") },
          { name: t("title"), path: localePath(locale, "teachers") },
          { name: teacher.name, path },
        ]),
      ]}
    >
      <TeacherProfile locale={locale} teacher={teacher} />
    </PageShell>
  );
}
