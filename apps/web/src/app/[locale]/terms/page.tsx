import { LegalPage } from "@/components/LegalPage";
import { innerPageMetadata, type PageProps } from "@/lib/page-meta";

// noindex hasta la revisión del propietario/abogado (NOINDEX_ROUTES en lib/routes.ts).
// TODO(legal): faltan plazos de cancelación, cargos, reembolsos y recuperación de
// clases; ver `page.terms.todoLegal` en messages/*.json.
export function generateMetadata({ params }: PageProps) {
  return innerPageMetadata(params, "terms", "terms");
}

export default function TermsPage({ params }: PageProps) {
  return <LegalPage params={params} route="terms" namespace="terms" />;
}
