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
    areaServed: AREAS,
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

const ORG_REF = { "@id": `${SITE_URL}/#organization` } as const;

/** Migas de pan: Inicio > ... > página actual. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export type LessonOffer = { description: string; price?: number; minPrice?: number };

/**
 * Clases para un público (adultos, niños, mayores) como Service. Solo precios
 * publicados en AUD; si no hay precio publicado, no hay oferta.
 */
export function lessonServiceJsonLd({
  locale,
  path,
  name,
  description,
  minAge,
  maxAge,
  offers,
}: {
  locale: Locale;
  path: string;
  name: string;
  description: string;
  minAge: number;
  maxAge?: number;
  offers: LessonOffer[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Spanish lessons",
    name,
    description,
    url: `${SITE_URL}${path}`,
    inLanguage: locale,
    provider: ORG_REF,
    areaServed: AREAS,
    audience: {
      "@type": "PeopleAudience",
      suggestedMinAge: minAge,
      ...(maxAge !== undefined ? { suggestedMaxAge: maxAge } : {}),
    },
    offers: offers.map((o) => ({
      "@type": "Offer",
      description: o.description,
      priceCurrency: "AUD",
      ...(o.price !== undefined
        ? { price: o.price }
        : { priceSpecification: { "@type": "PriceSpecification", minPrice: o.minPrice, priceCurrency: "AUD" } }),
    })),
  };
}

/** La profesora, con lo que publica su ficha: nativa (Lima), certificada A1–B2. */
export function teacherJsonLd(path: string, description: string, jobTitle: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Maribel Mayhua",
    jobTitle,
    description,
    url: `${SITE_URL}${path}`,
    knowsLanguage: "es",
    worksFor: ORG_REF,
  };
}

/** Página de contacto: apunta a la organización (que ya lleva teléfono, email y horario). */
export function contactPageJsonLd(locale: Locale, path: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name,
    url: `${SITE_URL}${path}`,
    inLanguage: locale,
    about: ORG_REF,
  };
}

const AREAS = [
  { "@type": "Place", name: "Sunshine Coast, Queensland, Australia" },
  { "@type": "Place", name: "Brisbane, Queensland, Australia" },
];

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
