import type { ReactNode } from "react";
import { Bubble, type BubbleTone } from "./Bubble";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { btnInk, btnOnDark, btnOnDarkOutline, btnPrimary, container } from "./styles";

export type HeroTone = "yellow" | "fuchsia" | "purple" | "burgundy";

/** Botón principal y secundario legibles sobre cada campo. */
export function heroButtons(tone: HeroTone): { primary: string; secondary: string } {
  return tone === "yellow"
    ? { primary: btnPrimary, secondary: btnInk }
    : { primary: btnOnDark, secondary: btnOnDarkOutline };
}

/** Un color sólido por campo; texto y rotulado con contraste AA sobre él. */
export const HERO_TONES: Record<HeroTone, { field: string; title: string; lettering: string; lead: string }> = {
  yellow: {
    field: "bg-brand-yellow text-ink",
    title: "text-brand-burgundy",
    lettering: "text-brand-fuchsia",
    lead: "text-ink",
  },
  fuchsia: {
    field: "on-dark bg-brand-fuchsia text-on-primary",
    title: "text-on-primary",
    lettering: "text-brand-yellow",
    lead: "text-on-primary",
  },
  purple: {
    field: "on-dark bg-brand-purple text-on-structure",
    title: "text-on-structure",
    lettering: "text-brand-yellow",
    lead: "text-on-structure",
  },
  burgundy: {
    field: "on-dark bg-brand-burgundy text-on-primary",
    title: "text-on-primary",
    lettering: "text-brand-yellow",
    lead: "text-on-primary",
  },
};

/**
 * Cabecera de página interior: migas, h1 rotulado (dos líneas: la segunda con
 * la extrusión del logo), entradilla, acciones y, a la derecha, la
 * conversación que abre la página.
 */
export function PageHero({
  tone,
  crumbs,
  titleA,
  titleB,
  lead,
  actions,
  aside,
  titleLang,
}: {
  tone: HeroTone;
  crumbs: Crumb[];
  titleA: string;
  /** Idioma del h1 si no es el de la página (títulos publicados en inglés). */
  titleLang?: string;
  titleB?: string;
  lead: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  const c = HERO_TONES[tone];

  return (
    <section aria-labelledby="page-title" className={`relative overflow-hidden ${c.field}`}>
      <div className={`${container} pt-3 pb-16 sm:pt-5 lg:pb-24`}>
        <Breadcrumbs items={crumbs} />
        <div className="mt-6 grid items-center gap-x-10 gap-y-12 lg:mt-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h1 id="page-title" lang={titleLang} className="font-display leading-[0.95] text-[clamp(2.75rem,9vw,4.5rem)] lg:text-[min(4.75rem,5.2vw)]">
              <span className={`block ${titleB ? "text-[0.72em] leading-[1.05]" : `lettering ${c.lettering}`} ${titleB ? c.title : ""}`}>
                {titleA}
              </span>
              {titleB && (
                <>
                  {" "}
                  <span className={`lettering block ${c.lettering}`}>{titleB}</span>
                </>
              )}
            </h1>
            <div className={`mt-6 max-w-[36rem] text-lg leading-relaxed sm:text-xl ${c.lead}`}>{lead}</div>
            {actions && <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>}
          </div>
          {aside && <div className="relative mx-auto w-full max-w-[28rem] lg:col-span-5 lg:max-w-none">{aside}</div>}
        </div>
      </div>
    </section>
  );
}

/**
 * La conversación del hero: el visitante pregunta (bocadillo blanco, cola a la
 * izquierda) y Spanglish responde (cola a la derecha). Texto real, no decorativo.
 * `badge` es un dato grande opcional (la edad) que se lee junto a la pregunta.
 */
export function HeroChat({
  ask,
  answer,
  answerTone,
  badge,
  badgeClassName = "",
}: {
  ask: string;
  answer: string;
  answerTone: BubbleTone;
  badge?: string;
  badgeClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      {badge && (
        <p
          aria-hidden="true"
          className={`lettering self-end font-display leading-[0.8] text-[clamp(6rem,24vw,10.5rem)] ${badgeClassName}`}
        >
          {badge}
        </p>
      )}
      <Bubble
        tone="white"
        tail="left"
        shadow
        className="pop mr-8 origin-bottom-left self-start"
        boxClassName="px-6 py-4 font-display text-[clamp(1.4rem,3.4vw,1.85rem)] leading-tight"
      >
        <p>{ask}</p>
      </Bubble>
      <Bubble
        tone={answerTone}
        tail="right"
        shadow
        className="pop ml-8 origin-bottom-right self-end [--i:1]"
        boxClassName="px-6 py-5 font-display text-[clamp(1.4rem,3.4vw,1.85rem)] leading-[1.1]"
      >
        <p>{answer}</p>
      </Bubble>
    </div>
  );
}
