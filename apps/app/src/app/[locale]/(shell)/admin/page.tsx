import { AreaPage } from "../area-page";

export default function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  return <AreaPage params={params} area="admin" />;
}
