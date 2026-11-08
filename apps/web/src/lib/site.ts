/**
 * Datos públicos del negocio (ya publicados en spanglish.com.au). Una sola
 * fuente para la página, el pie y el JSON-LD. Los textos van en messages/.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://spanglish.com.au").replace(/\/$/, "");

export const CONTACT = {
  phoneDisplay: "0413 178 583",
  phoneE164: "+61413178583",
  email: "hello@spanglish.com.au",
  /** Lunes a sábado, 8:00 a 17:00 (hora de Queensland). */
  hours: { days: ["Mo", "Tu", "We", "Th", "Fr", "Sa"], opens: "08:00", closes: "17:00" },
} as const;

/** Lecciones interactivas gratis de la web actual (hasta migrarlas a /learn). */
export const LEARN_URL = "https://spanglish.com.au/learn-spanish/";

export const SOCIAL = [
  { key: "facebook", label: "Facebook", href: "https://www.facebook.com/worldwide.spanglish" },
  { key: "instagram", label: "Instagram", href: "https://www.instagram.com/spanglishworldwide" },
  { key: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@spanglishworldwide" },
  { key: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/company/spanglishworldwide" },
  { key: "threads", label: "Threads", href: "https://www.threads.com/@spanglishworldwide" },
] as const;
