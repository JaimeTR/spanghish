import { AreaLayout } from "../area-layout";

export default function TeacherLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return (
    <AreaLayout params={params} area="teacher">
      {children}
    </AreaLayout>
  );
}
