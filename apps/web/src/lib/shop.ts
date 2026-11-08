import type { Locale } from "../i18n/routing";

/**
 * Tienda de materiales: ÚNICA fuente de los productos y sus precios (en
 * centavos de AUD). El servidor reconstruye el pago a partir de los ids y de
 * esta lista; nunca se fía de un precio que llegue del navegador.
 *
 * Origen: los tres productos reales de la tienda WooCommerce de
 * spanglish.com.au (nombre, precio, precio rebajado e imagen tal como se
 * publicaron). El resto de "productos" de esa tienda eran plantillas y no se copian.
 *
 * Formato de los archivos: desconocido (no se ha publicado). Por eso solo se dice
 * "material descargable": nada de PDF, número de páginas, etc.
 *
 * ENTREGA MANUAL (fase 1): tras el pago, Maribel recibe un email con el pedido
 * (webhook de Stripe -> lib/leads.ts) y envía los archivos por email.
 * Fase 2: archivos en almacenamiento privado, enlace de descarga firmado y con
 * caducidad en el email al cliente, enviado automáticamente desde el webhook.
 */
export type ProductType = "digital-download";

export type Product = {
  /** Identificador estable (también el slug publicado en /product/<slug>/). */
  id: string;
  /** Nombre publicado, por idioma (se publicó en inglés o bilingüe). */
  name: Record<Locale, string>;
  /** Idioma del nombre publicado, para el atributo lang en la página en español. */
  nameLang?: "en";
  /** Precio que se cobra, en centavos de AUD. */
  priceCents: number;
  /** Precio anterior (tachado), en centavos de AUD. */
  compareAtCents?: number;
  image: { src: string; width: number; height: number };
  /** Clave de los textos en messages: `shop.products.<key>.{summary,alt}`. */
  copyKey: string;
  type: ProductType;
  /** La descripción publicada era un texto de plantilla: pendiente del texto real. */
  placeholderCopy?: boolean;
};

export const PRODUCTS: readonly Product[] = [
  {
    id: "alphabet",
    name: { es: "El Abecedario – The Alphabet", en: "El Abecedario – The Alphabet" },
    priceCents: 200,
    compareAtCents: 500,
    image: { src: "/img/shop/alphabet.webp", width: 900, height: 614 },
    copyKey: "alphabet",
    type: "digital-download",
    placeholderCopy: true,
  },
  {
    id: "spanish-regular-verbs-basic",
    name: { es: "Spanish Regular Verbs Basic", en: "Spanish Regular Verbs Basic" },
    nameLang: "en",
    priceCents: 200,
    compareAtCents: 500,
    image: { src: "/img/shop/regular-verbs-basic.webp", width: 900, height: 733 },
    copyKey: "regularVerbsBasic",
    type: "digital-download",
  },
  {
    id: "regular-verbs-spanish",
    name: { es: "Regular Verbs in Spanish", en: "Regular Verbs in Spanish" },
    nameLang: "en",
    priceCents: 199,
    compareAtCents: 499,
    image: { src: "/img/shop/regular-verbs.webp", width: 600, height: 600 },
    copyKey: "regularVerbs",
    type: "digital-download",
  },
];

/** Máximo de productos distintos por pedido (materiales digitales: uno de cada). */
export const MAX_ITEMS = 10;

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function isProductId(id: unknown): id is string {
  return typeof id === "string" && PRODUCTS.some((p) => p.id === id);
}

/** "$2.00": mismo formato en ambos idiomas (el que usaba la tienda publicada). */
export function formatAud(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Suma de los precios (servidor) de los ids conocidos. */
export function subtotalCents(ids: readonly string[]): number {
  return ids.reduce((sum, id) => sum + (findProduct(id)?.priceCents ?? 0), 0);
}

/** Descuento publicado para alumnos matriculados (solo informativo: no se aplica en el pago). */
export const STUDENT_DISCOUNT_PERCENT = 30;
