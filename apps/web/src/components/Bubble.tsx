import type { ReactNode } from "react";

export type BubbleTone = "white" | "yellow" | "fuchsia" | "purple" | "burgundy" | "cream";

const TONES: Record<BubbleTone, { box: string; tail: string }> = {
  white: { box: "bg-surface text-ink", tail: "text-surface" },
  cream: { box: "bg-cream text-ink", tail: "text-cream" },
  yellow: { box: "bg-brand-yellow text-ink", tail: "text-brand-yellow" },
  fuchsia: { box: "bg-brand-fuchsia text-on-primary", tail: "text-brand-fuchsia" },
  purple: { box: "bg-brand-purple text-on-structure", tail: "text-brand-purple" },
  burgundy: { box: "bg-brand-burgundy text-on-primary", tail: "text-brand-burgundy" },
};

/**
 * Bocadillo de conversación, el gesto del logo. La cola es un trazo SVG pegado
 * al borde inferior; `shadow` añade la extrusión burdeos del logo (sigue la
 * forma completa, cola incluida, porque es un drop-shadow).
 */
export function Bubble({
  tone = "white",
  tail = "left",
  shadow = false,
  className = "",
  boxClassName = "",
  children,
}: {
  tone?: BubbleTone;
  tail?: "left" | "right" | "none";
  shadow?: boolean;
  className?: string;
  boxClassName?: string;
  children: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div
      className={`relative ${tail === "none" ? "" : "mb-4"} ${className}`}
      style={shadow ? { filter: "drop-shadow(var(--bubble-shadow))" } : undefined}
    >
      <div className={`relative rounded-[1.75rem] ${t.box} ${boxClassName}`}>{children}</div>
      {tail !== "none" && (
        <svg
          aria-hidden="true"
          viewBox="0 0 34 22"
          className={`absolute -bottom-[19px] h-[22px] w-[34px] ${t.tail} ${
            tail === "left" ? "left-7" : "right-7 -scale-x-100"
          }`}
        >
          <path d="M0 0h34C26 6 15 14 2 22c5-8 6-15-2-22Z" fill="currentColor" />
        </svg>
      )}
    </div>
  );
}

/**
 * Pregunta de sección: el h2 dentro de un bocadillo. La página es una
 * conversación: el visitante pregunta, Spanglish responde debajo.
 */
export function SectionQuestion({
  id,
  tone = "white",
  tail = "left",
  className = "",
  children,
}: {
  id: string;
  tone?: BubbleTone;
  tail?: "left" | "right";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Bubble tone={tone} tail={tail} shadow className={`inline-block max-w-full ${className}`} boxClassName="px-6 py-4 sm:px-8 sm:py-5">
      <h2 id={id} className="font-display text-[clamp(1.875rem,4.6vw,3rem)] leading-[1.02]">
        {children}
      </h2>
    </Bubble>
  );
}
