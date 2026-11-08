import { AreaLayout } from "../area-layout";

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return (
    <AreaLayout params={params} area="admin">
      {children}
    </AreaLayout>
  );
}
