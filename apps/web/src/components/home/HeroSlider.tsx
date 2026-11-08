"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const INTERVAL_MS = 7000;

export type HeroSliderLabels = {
  region: string;
  /** Una etiqueta por diapositiva ("Ir a la diapositiva 2 de 3"), resuelta en el servidor. */
  goTo: string[];
};

/**
 * Carrusel del hero. Las diapositivas se apilan en la misma celda de una
 * cuadrícula (la altura es la de la más alta: sin saltos de maquetación) y se
 * funden entre sí. Las inactivas llevan `inert`, así que no entran en el orden
 * de tabulación ni en el árbol de accesibilidad.
 *
 * Solo puntos como control (y deslizar en móvil). El cambio automático se
 * detiene mientras el puntero está sobre el hero, hay foco dentro o se toca la
 * pantalla (se entiende que están leyendo), y no arranca si el usuario pide
 * menos movimiento.
 */
export function HeroSlider({ slides, labels }: { slides: ReactNode[]; labels: HeroSliderLabels }) {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focusing, setFocusing] = useState(false);
  const [reduced, setReduced] = useState(true);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback((n: number) => setIndex(((n % count) + count) % count), [count]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const running = !hovering && !focusing && !reduced;

  // Reinicia la cuenta al cambiar de diapositiva a mano (index en las dependencias).
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [running, count, index]);

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={labels.region}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocusing(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocusing(false);
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
        setHovering(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        setHovering(false);
        const end = e.changedTouches[0]?.clientX;
        if (start == null || end == null || Math.abs(end - start) < 50) return;
        go(index + (end < start ? 1 : -1));
      }}
    >
      <div className="grid">
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={labels.goTo[i]}
            data-active={i === index}
            inert={i !== index}
            className="hero-slide col-start-1 row-start-1"
          >
            {slide}
          </div>
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-[76rem] items-center px-4 pb-8 sm:px-6 lg:px-10 lg:pb-12">
        <div className="-ml-3 flex items-center">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={labels.goTo[i]}
              aria-current={i === index ? "true" : undefined}
              className="group inline-flex size-11 items-center justify-center"
            >
              <span
                className={`block h-3 rounded-full bg-ink transition-[width,opacity] duration-300 ease-out group-hover:opacity-100 motion-reduce:transition-none ${
                  i === index ? "w-8 opacity-100" : "w-3 opacity-35"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      <div aria-live={running ? "off" : "polite"} className="sr-only">
        {labels.goTo[index]}
      </div>
    </div>
  );
}
