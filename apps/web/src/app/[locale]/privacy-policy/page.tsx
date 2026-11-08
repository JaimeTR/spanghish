import { LegalPage } from "@/components/LegalPage";
import { innerPageMetadata, type PageProps } from "@/lib/page-meta";

// noindex hasta la revisión del propietario/abogado (NOINDEX_ROUTES en lib/routes.ts).
export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "privacy", "privacy");
}

export default function PrivacyPage({ params }: PageProps) {
  return <LegalPage params={params} route="privacy" namespace="privacy" />;
}
