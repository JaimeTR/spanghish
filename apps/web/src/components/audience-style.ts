import type { Audience } from "@/lib/lessons";
import type { BubbleTone } from "./Bubble";
import type { HeroTone } from "./PageHero";

/**
 * Cada público conserva el color que tiene en la home: adultos fucsia, niños
 * amarillo, mayores morado. El mismo color abre su página.
 */
export const AUDIENCE_STYLE: Record<
  Audience,
  { hero: HeroTone; tile: string; answer: BubbleTone; badge: string }
> = {
  adults: {
    hero: "fuchsia",
    tile: "on-dark bg-brand-fuchsia text-on-primary",
    answer: "yellow",
    badge: "text-brand-yellow",
  },
  kids: {
    hero: "yellow",
    tile: "bg-brand-yellow text-ink",
    answer: "purple",
    badge: "text-brand-fuchsia",
  },
  mature: {
    hero: "purple",
    tile: "on-dark bg-brand-purple text-on-structure",
    answer: "fuchsia",
    badge: "text-brand-yellow",
  },
};
