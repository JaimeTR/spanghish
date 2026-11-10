import { redirect } from "next/navigation";

/** El alta vive en un modal de la lista; esta dirección se conserva (con ?category y ?level) y lo abre. */
export default async function NewLessonPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ category?: string; level?: string }> }) {
  const { locale } = await params;
  const { category, level } = await searchParams;
  const query = new URLSearchParams({ new: "1" });
  if (category) query.set("category", category);
  if (level) query.set("level", level);
  redirect(`/${locale}/admin/lessons?${query}`);
}
