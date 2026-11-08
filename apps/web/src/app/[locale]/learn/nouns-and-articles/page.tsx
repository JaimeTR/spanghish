import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LessonPage } from "@/components/learn/LessonPage";
import { NounsLesson } from "@/components/learn/NounsLesson";
import { isLocale } from "@/i18n/routing";
import { innerPageMetadata, type PageProps } from "@/lib/page-meta";

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "learnNouns", "learnNouns");
}

/**
 * "Spanish Nouns & Articles", copiada de
 * spanglish.com.au/learn-spanish/spanish-adults-lessons/level-a1/the-nouns-in-spanish/
 * (publicada en Adults > Level A1: de ahí el nivel del JSON-LD).
 */
export default async function NounsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  return (
    <LessonPage locale={locale} route="learnNouns" teaches="Spanish nouns: gender, plurals and articles" educationalLevel="A1">
      <NounsLesson />
    </LessonPage>
  );
}
