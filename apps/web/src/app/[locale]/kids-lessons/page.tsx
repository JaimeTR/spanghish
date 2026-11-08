import { audienceMetadata, AudienceRoute } from "@/components/lessons/AudienceRoute";
import type { PageProps } from "@/lib/page-meta";

export const generateMetadata = audienceMetadata("kids");

export default function Page({ params }: PageProps) {
  return <AudienceRoute params={params} audience="kids" />;
}
