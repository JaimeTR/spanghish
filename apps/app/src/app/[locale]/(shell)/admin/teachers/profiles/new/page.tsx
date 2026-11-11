import { redirect } from "next/navigation";

/** El alta de la ficha pública se hace desde la fila del docente en Docentes. */
export default async function NewTeacherProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/admin/teachers`);
}
