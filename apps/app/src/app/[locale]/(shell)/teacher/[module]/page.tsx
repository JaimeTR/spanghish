import { DevModulePage } from "../../dev-module-page";

export default function TeacherDevModulePage({
  params,
}: {
  params: Promise<{ locale: string; module: string }>;
}) {
  return <DevModulePage params={params} area="teacher" />;
}
