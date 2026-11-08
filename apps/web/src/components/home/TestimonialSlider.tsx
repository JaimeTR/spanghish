"use client";

import { useEffect, useRef, useState } from "react";
import { Bubble, type BubbleTone } from "../Bubble";

export type TestimonialItem = { name: string; kind: string; text: string };

const TONES: { tone: BubbleTone; tail: "left" | "right" }[] = [
  { tone: "white", tail: "left" },
  { tone: "fuchsia", tail: "right" },
  { tone: "purple", tail: "left" },
  { tone: "cream", tail: "right" },
  { tone: "white", tail: "left" },
];

/** Segundos que se queda cada opinión, según su longitud (mínimo 6 s). */
const readSeconds = (text: string) => Math.max(6, Math.round(text.length / 18));

/**
 * Opiniones una a una, como una conversación que va pasando. Cada opinión es un
 * bocadillo grande; abajo, un avatar por alumno con una barra que se llena
 * mientras se lee. Se detiene con el puntero encima, con el foco dentro o al
 * tocar, y no avanza solo si el usuario pide menos movimiento. La altura se
 * ajusta a la opinión activa (sin huecos con las cortas).
 */
export function TestimonialSlider({
  items,
  label,
  goTo,
}: {
  items: TestimonialItem[];
  label: string;
  /** Una etiqueta accesible por opinión, ya resuelta ("Opinión 2 de 5: Tia"). */
  goTo: string[];
}) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const touchX = useRef<number | null>(null);
  const count = items.length;
  const go = (n: number) => setIndex(((n % count) + count) % count);

  // Ajusta la altura a la opinión activa y la mantiene si cambia el ancho.
  useEffect(() => {
    const el = slideRefs.current[index];
    if (!el) return;
    const update = () => setHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [index]);

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      data-held={held}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
        setHeld(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        setHeld(false);
        const end = e.changedTouches[0]?.clientX;
        if (start == null || end == null || Math.abs(end - start) < 50) return;
        go(index + (end < start ? 1 : -1));
      }}
    >
      <div className="t-stage grid" style={height ? { height } : undefined}>
        {items.map((item, i) => {
          const { tone, tail } = TONES[i % TONES.length]!;
          return (
            <div
              key={item.name}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              role="group"
              aria-roledescription="slide"
              aria-label={goTo[i]}
              data-active={i === index}
              inert={i !== index}
              className="t-slide col-start-1 row-start-1 self-start"
            >
              <figure>
                <Bubble tone={tone} tail={tail} shadow boxClassName="relative px-7 pt-12 pb-7 sm:px-10 sm:pt-14 sm:pb-9">
                  <span aria-hidden="true" className="absolute top-3 left-6 font-display text-[4.5rem] leading-none opacity-30 sm:left-9 sm:text-[5.5rem]">
                    “
                  </span>
                  <blockquote lang="en" className="relative text-xl leading-relaxed sm:text-2xl sm:leading-relaxed">
                    {item.text}
                  </blockquote>
                </Bubble>
                <figcaption className={`mt-7 flex items-center gap-3 font-bold text-ink ${tail === "right" ? "justify-end" : ""}`}>
                  <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-brand-burgundy font-display text-xl text-on-primary">
                    {item.name[0]}
                  </span>
                  <span className="text-lg">
                    {item.name}
                    <span className="block text-sm font-semibold text-ink/75">{item.kind}</span>
                  </span>
                </figcaption>
              </figure>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-start gap-x-2 gap-y-3">
        {items.map((item, i) => {
          const active = i === index;
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => go(i)}
              aria-label={goTo[i]}
              aria-current={active ? "true" : undefined}
              className="group flex min-h-11 flex-col items-center gap-1.5 rounded-full px-1"
            >
              <span
                aria-hidden="true"
                className={`flex size-11 items-center justify-center rounded-full border-2 font-display text-lg transition-[background-color,color,transform,border-color] duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 ${
                  active ? "scale-105 border-brand-burgundy bg-brand-burgundy text-on-primary" : "border-ink/40 text-ink group-hover:border-ink"
                }`}
              >
                {item.name[0]}
              </span>
              <span aria-hidden="true" className="block h-1 w-9 overflow-hidden rounded-full bg-ink/15">
                {active && (
                  <span
                    key={index}
                    className="t-fill block h-full w-full origin-left rounded-full bg-brand-burgundy"
                    style={{ ["--dur" as string]: `${readSeconds(item.text)}s` }}
                    onAnimationEnd={() => go(index + 1)}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
