import { DevModulePage } from "../../dev-module-page";

export default function GuardianDevModulePage({
  params,
}: {
  params: Promise<{ locale: string; module: string }>;
}) {
  return <DevModulePage params={params} area="guardian" />;
}
