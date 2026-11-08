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
 * Una opinión a la vez, como una conversación que va pasando: cada una es un
 * bocadillo grande (la cola alterna de lado) que entra y sale con un fundido
 * suave. Sin puntos ni flechas: avanza sola según lo que cuesta leerla, se
 * detiene con el puntero encima, con el foco dentro o al tocar, y se puede
 * deslizar con el dedo. La altura se ajusta a la opinión activa. Con "reducir
 * movimiento" no hay carrusel: se muestran todas una debajo de otra.
 */
export function TestimonialSlider({ items, label }: { items: TestimonialItem[]; label: string }) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const touchX = useRef<number | null>(null);
  const count = items.length;
  const go = (n: number) => setIndex(((n % count) + count) % count);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Avanza sola, según el largo del texto de la opinión visible.
  useEffect(() => {
    if (reduced || held) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), readSeconds(items[index]!.text) * 1000);
    return () => window.clearTimeout(id);
  }, [index, held, reduced, count, items]);

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
      <div className="t-stage grid pb-2" style={height ? { height } : undefined}>
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
              aria-label={`${i + 1} / ${count}`}
              data-active={i === index}
              inert={!reduced && i !== index ? true : undefined}
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
    </div>
  );
}
