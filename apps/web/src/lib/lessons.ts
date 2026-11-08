import { PRICES } from "./prices";
import type { RouteKey } from "./routes";

/**
 * Datos de las páginas de clases por edad, tal como están publicados en
 * spanglish.com.au (/adult-lessons, /kids-lessons, /mature-lessons). Los textos
 * van en messages/ bajo `page.<audiencia>`; aquí solo la estructura.
 */
export type Audience = "adults" | "kids" | "mature";
export type FormatKey = "private" | "own" | "local";
export type Place =
  | "online"
  | "tutorPlace"
  | "library"
  | "yourPlace"
  | "localOffice"
  | "homeStudy"
  | "libraryF2F"
  | "yourPlaceF2F"
  | "custom";
export type GroupKey = "program10" | "payg" | "modes";

export type FormatGroup = {
  key: GroupKey;
  formats: { format: FormatKey; places: Place[]; maxTwo?: boolean }[];
};

export type AudienceData = {
  route: RouteKey;
  minAge: number;
  maxAge?: number;
  formatGroups: FormatGroup[];
  /** Claves de `page.<audiencia>.faq.*`: solo preguntas con respuesta en la web actual. */
  faq: readonly string[];
  /** Claves de `page.<audiencia>.how.*`: actividades de clase publicadas para ese público. */
  activities: readonly string[];
  /** Bloques de precio, en orden. Solo precios publicados; "privateAsk" = se piden por email. */
  prices: readonly PriceKey[];
  /** Precios publicados en AUD para el JSON-LD (los textos visibles están en messages). */
  offers: readonly { key: PriceKey; price?: number; minPrice?: number; upfront?: boolean }[];
};

export type PriceKey = "free" | "group" | "privateAsk" | "program" | "single";

const OWN_GROUP = { format: "own", places: ["online", "yourPlace", "tutorPlace"], maxTwo: true } as const;

export const AUDIENCES: Record<Audience, AudienceData> = {
  adults: {
    route: "adults",
    minAge: 14,
    formatGroups: [
      {
        key: "program10",
        formats: [
          { format: "private", places: ["online", "tutorPlace", "library"] },
          { ...OWN_GROUP, places: [...OWN_GROUP.places] },
          { format: "local", places: ["localOffice"] },
        ],
      },
      {
        key: "payg",
        formats: [
          { format: "private", places: ["online", "tutorPlace"] },
          { ...OWN_GROUP, places: [...OWN_GROUP.places] },
        ],
      },
    ],
    faq: ["level", "length", "payg", "private"],
    activities: ["visual", "roleplay", "conversation", "exercises"],
    prices: ["free", "group", "privateAsk"],
    offers: [
      { key: "free", price: PRICES.free },
      { key: "group", minPrice: PRICES.groupFrom },
    ],
  },
  kids: {
    route: "kids",
    minAge: 6,
    maxAge: 13,
    formatGroups: [
      {
        key: "program10",
        formats: [
          { format: "private", places: ["online", "tutorPlace", "library"] },
          { ...OWN_GROUP, places: [...OWN_GROUP.places] },
          { format: "local", places: ["localOffice"] },
        ],
      },
      {
        key: "payg",
        formats: [
          { format: "private", places: ["online", "tutorPlace", "library"] },
          { ...OWN_GROUP, places: [...OWN_GROUP.places] },
        ],
      },
    ],
    faq: ["ages", "homeschool", "length", "private"],
    activities: ["visual", "games", "songs", "exercises"],
    prices: ["free", "group", "privateAsk"],
    offers: [
      { key: "free", price: PRICES.free },
      { key: "group", minPrice: PRICES.groupFrom },
    ],
  },
  mature: {
    route: "mature",
    minAge: 65,
    formatGroups: [
      {
        key: "modes",
        formats: [
          { format: "private", places: ["online", "homeStudy", "libraryF2F"] },
          { format: "own", places: ["yourPlaceF2F", "custom"] },
        ],
      },
    ],
    faq: ["level", "upfront", "friends", "length"],
    activities: ["repetition", "social", "memory"],
    prices: ["free", "program", "single"],
    offers: [
      { key: "free", price: PRICES.free },
      { key: "program", price: PRICES.matureLesson },
      { key: "program", price: PRICES.matureUpfront, upfront: true },
      { key: "single", price: PRICES.matureSingle },
    ],
  },
};

/** Las otras dos páginas de clases, para "también te puede interesar". */
export function relatedAudiences(current: Audience): Audience[] {
  return (Object.keys(AUDIENCES) as Audience[]).filter((a) => a !== current);
}
