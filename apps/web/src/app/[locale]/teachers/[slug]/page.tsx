import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageShell } from "@/components/PageShell";
import { TeacherProfile } from "@/components/TeacherProfile";
import { isLocale, routing } from "@/i18n/routing";
import { localePath } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, teacherJsonLd } from "@/lib/structured-data";
import { TEACHERS, teacherBySlug, teacherPath } from "@/lib/teachers";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => TEACHERS.map((teacher) => ({ locale, slug: teacher.slug })));
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const teacher = teacherBySlug(slug);
  if (!isLocale(locale) || !teacher) return {};
  const t = await getTranslations({ locale, namespace: "page.teachers" });
  const p = await getTranslations({ locale, namespace: `page.teachers.people.${teacher.key}` });
  const tm = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    route: "teachers",
    subpath: teacher.slug,
    title: t("profileMetaTitle", { name: teacher.name }),
    description: p("metaDescription"),
    ogAlt: tm("ogAlt"),
  });
}

export default async function TeacherPage({ params }: Props) {
  const { locale, slug } = await params;
  const teacher = teacherBySlug(slug);
  if (!isLocale(locale) || !teacher) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "page.teachers" });
  const p = await getTranslations({ locale, namespace: `page.teachers.people.${teacher.key}` });
  const tn = await getTranslations({ locale, namespace: "nav" });
  const path = teacherPath(locale, teacher.slug);

  return (
    <PageShell
      locale={locale}
      route="teachers"
      jsonLd={[
        teacherJsonLd(path, p("metaDescription"), p("role"), teacher.name),
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
