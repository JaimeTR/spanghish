import { AreaPage } from "../area-page";

export default function GuardianPage({ params }: { params: Promise<{ locale: string }> }) {
  return <AreaPage params={params} area="guardian" />;
}
