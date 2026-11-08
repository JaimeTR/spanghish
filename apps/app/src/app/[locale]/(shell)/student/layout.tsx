import { AreaLayout } from "../area-layout";

export default function StudentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return (
    <AreaLayout params={params} area="student">
      {children}
    </AreaLayout>
  );
}
