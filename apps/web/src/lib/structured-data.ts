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

/**
 * Conversación online como Course: solo datos publicados (nivel intermedio,
 * 10 semanas, una clase online de 50 minutos por semana y sus dos precios en
 * AUD). Sin fechas: cambian en cada edición.
 */
export function onlineCourseJsonLd({
  path,
  name,
  description,
  offers,
}: {
  path: string;
  name: string;
  description: string;
  offers: { description: string; price: number }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    url: `${SITE_URL}${path}`,
    // El curso se da en español, sea cual sea el idioma de la página.
    inLanguage: "es",
    educationalLevel: "Intermediate",
    provider: ORG_REF,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      courseSchedule: { "@type": "Schedule", repeatFrequency: "P1W", repeatCount: 10, duration: "PT50M" },
    },
    offers: offers.map((o) => ({
      "@type": "Offer",
      category: "Paid",
      description: o.description,
      price: o.price,
      priceCurrency: "AUD",
    })),
  };
}

/** Una profesora, con lo que publica su ficha (por defecto, Maribel). */
export function teacherJsonLd(path: string, description: string, jobTitle: string, name = "Maribel Mayhua") {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
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

/** Preguntas frecuentes (solo las que se muestran en la página, con el mismo texto). */
export function faqPageJsonLd(locale: Locale, path: string, items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: `${SITE_URL}${path}`,
    inLanguage: locale,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/**
 * Lección interactiva gratis como LearningResource, solo con lo que se sabe:
 * nombre, que es gratis, interactiva, en inglés (para quien aprende español),
 * qué enseña y, si la web anterior lo publicaba, el nivel.
 */
export function learningResourceJsonLd({
  path,
  name,
  description,
  teaches,
  educationalLevel,
}: {
  path: string;
  name: string;
  description: string;
  teaches: string;
  educationalLevel?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name,
    description,
    url: `${SITE_URL}${path}`,
    inLanguage: "en",
    learningResourceType: "Interactive lesson",
    interactivityType: "active",
    isAccessibleForFree: true,
    teaches,
    ...(educationalLevel ? { educationalLevel } : {}),
    provider: ORG_REF,
  };
}
