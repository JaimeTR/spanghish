import { AreaLayout } from "../area-layout";

export default function GuardianLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return (
    <AreaLayout params={params} area="guardian">
      {children}
    </AreaLayout>
  );
}
