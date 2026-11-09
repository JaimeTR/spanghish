import { DevModulePage } from "../../dev-module-page";

export default function AdminDevModulePage({
  params,
}: {
  params: Promise<{ locale: string; module: string }>;
}) {
  return <DevModulePage params={params} area="admin" />;
}
