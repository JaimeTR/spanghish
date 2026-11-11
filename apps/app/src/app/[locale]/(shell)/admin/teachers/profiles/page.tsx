import { redirect } from "next/navigation";

/** La ficha pública se gestiona desde la lista de Docentes (ojo para mostrar u ocultar en la web). */
export default async function TeacherProfilesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/admin/teachers`);
}
