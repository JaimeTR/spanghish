import { AreaPage } from "../area-page";

export default function StudentPage({ params }: { params: Promise<{ locale: string }> }) {
  return <AreaPage params={params} area="student" />;
}
