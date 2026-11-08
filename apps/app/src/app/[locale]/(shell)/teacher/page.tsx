import { AreaPage } from "../area-page";

export default function TeacherPage({ params }: { params: Promise<{ locale: string }> }) {
  return <AreaPage params={params} area="teacher" />;
}
