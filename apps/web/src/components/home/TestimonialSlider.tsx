"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bubble, type BubbleTone } from "../Bubble";

export type TestimonialItem = { name: string; kind: string; text: string };

const TONES: BubbleTone[] = ["white", "fuchsia", "purple", "cream", "white"];

/** Cuánto se queda cada paso en pantalla. */
const STEP_MS = 8000;
/** Cuántas tarjetas se clonan al final para que el bucle no tenga corte (máximo visible). */
const CLONES = 2;

/**
 * Opiniones que van pasando solas, sin puntos ni flechas: 1 tarjeta en móvil y
 * 2 en pantallas grandes (una con la cola a cada lado). Cada bocadillo se ajusta a
 * su texto, con una altura mínima para que los cortos no queden vacíos.
 * Avanzan de una en una en bucle continuo; se detienen con el puntero encima,
 * con el foco dentro o al tocar, y se pueden arrastrar con el dedo.
 * Con "reducir movimiento" no hay carrusel: se muestran todas en una cuadrícula.
 */
export function TestimonialSlider({ items, label }: { items: TestimonialItem[]; label: string }) {
  const count = items.length;
  const [p, setP] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [held, setHeld] = useState(false);
  const [reduced, setReduced] = useState(true);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const next = useCallback(() => {
    setAnimate(true);
    setP((v) => v + 1);
  }, []);

  const prev = useCallback(() => {
    if (p === 0) {
      // Salta (sin animar) a la copia del final y retrocede desde ahí.
      setAnimate(false);
      setP(count);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setAnimate(true);
          setP(count - 1);
        }),
      );
    } else {
      setAnimate(true);
      setP(p - 1);
    }
  }, [p, count]);

  useEffect(() => {
    if (reduced || held) return;
    const id = window.setTimeout(next, STEP_MS);
    return () => window.clearTimeout(id);
  }, [p, held, reduced, next]);

  const all = [...items, ...items.slice(0, CLONES)];

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      className="t-viewport -mx-2 overflow-hidden pt-2 pb-10 lg:-mx-4"
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
        if (end < start) next();
        else prev();
      }}
    >
      <ul
        className="t-track flex items-start [--per:1] lg:[--per:2]"
        style={{ ["--p" as string]: reduced ? 0 : p, ["--anim" as string]: animate ? "650ms" : "0ms" }}
        onTransitionEnd={(e) => {
          if (e.target !== e.currentTarget || p < count) return;
          setAnimate(false);
          setP(p - count);
        }}
      >
        {all.map((item, i) => {
          const idx = i % count;
          const clone = i >= count;
          const tail = idx % 2 === 0 ? "left" : "right";
          return (
            <li
              key={i}
              aria-hidden={clone || undefined}
              inert={clone || undefined}
              className={`t-card flex shrink-0 basis-full px-2 lg:basis-1/2 lg:px-4 ${clone ? "t-clone" : ""}`}
            >
              <figure className="w-full">
                <Bubble
                  tone={TONES[idx % TONES.length]!}
                  tail={tail}
                  shadow
                  boxClassName="relative min-h-[15rem] px-7 pt-12 pb-7 sm:min-h-[16rem] sm:px-9 sm:pt-14 sm:pb-8"
                >
                  <span aria-hidden="true" className="absolute top-3 left-6 font-display text-[4.5rem] leading-none opacity-30 sm:left-8 sm:text-[5.5rem]">
                    “
                  </span>
                  <blockquote lang="en" className="relative text-lg leading-relaxed sm:text-xl sm:leading-relaxed">
                    {item.text}
                  </blockquote>
                </Bubble>
                <figcaption className={`mt-7 flex items-center gap-3 font-bold text-ink ${tail === "right" ? "justify-end" : ""}`}>
                  <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-burgundy font-display text-xl text-on-primary">
                    {item.name[0]}
                  </span>
                  <span className="text-lg leading-tight">
                    {item.name}
                    <span className="block text-sm font-semibold text-ink/75">{item.kind}</span>
                  </span>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
