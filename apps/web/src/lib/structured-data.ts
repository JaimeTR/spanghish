import type { Locale } from "../i18n/routing";
import { CONTACT, SITE_URL, SOCIAL } from "./site";

/**
 * JSON-LD de la escuela. Solo datos reales y públicos: sin dirección postal,
 * precios ni valoraciones (no hay fuente para ellos todavía).
 */
export function organizationJsonLd(locale: Locale, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "LocalBusiness"],
    "@id": `${SITE_URL}/#organization`,
    name: "Spanglish",
    url: `${SITE_URL}/${locale}`,
    logo: `${SITE_URL}/logo-spanglish.png`,
    image: `${SITE_URL}/og-spanglish.png`,
    description,
    telephone: CONTACT.phoneE164,
    email: CONTACT.email,
    inLanguage: locale,
    areaServed: [
      { "@type": "Place", name: "Sunshine Coast, Queensland, Australia" },
      { "@type": "Place", name: "Brisbane, Queensland, Australia" },
    ],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: CONTACT.hours.days.map((d) => DAY_NAMES[d]),
      opens: CONTACT.hours.opens,
      closes: CONTACT.hours.closes,
    },
    founder: { "@type": "Person", name: "Maribel Mayhua", jobTitle: "Spanish tutor" },
    sameAs: SOCIAL.map((s) => s.href),
  };
}

const DAY_NAMES: Record<(typeof CONTACT.hours.days)[number], string> = {
  Mo: "Monday",
  Tu: "Tuesday",
  We: "Wednesday",
  Th: "Thursday",
  Fr: "Friday",
  Sa: "Saturday",
};

/** Serializa para <script type="application/ld+json"> sin permitir cerrar la etiqueta. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
