import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AlphabetLesson } from "@/components/learn/AlphabetLesson";
import { LessonPage } from "@/components/learn/LessonPage";
import { isLocale } from "@/i18n/routing";
import { innerPageMetadata, type PageProps } from "@/lib/page-meta";

export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "learnAlphabet", "learnAlphabet");
}

/** "The Spanish Alphabet", copiada de spanglish.com.au/learn-spanish/spanish-foundations/spanish-alphabet/. */
export default async function AlphabetPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  return (
    <LessonPage locale={locale} route="learnAlphabet" teaches="The Spanish alphabet and its pronunciation">
      <AlphabetLesson />
    </LessonPage>
  );
}
