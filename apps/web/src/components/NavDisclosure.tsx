"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

/** Color de cada subpágina de "Clases": el mismo que su bloque en la home. */
export type NavTone = "neutral" | "fuchsia" | "yellow" | "purple" | "burgundy";

export type NavSubItem = {
  key: string;
  href: string;
  label: string;
  /** Edad (14+, 6–13, 65+): pastilla visible; se lee como "(14+)". */
  badge?: string;
  tone: NavTone;
  current: boolean;
};

/** Sobre el panel morado del menú de móvil: el neutro y el morado necesitan contorno claro. */
const BADGE_ON_DARK: Partial<Record<NavTone, string>> = {
  neutral: "bg-transparent text-on-structure ring-2 ring-on-structure/45",
  purple: "bg-brand-purple text-on-structure ring-2 ring-on-structure/60",
};

const BADGE: Record<NavTone, string> = {
  neutral: "bg-transparent text-ink ring-2 ring-ink/25",
  fuchsia: "bg-brand-fuchsia text-on-primary",
  yellow: "bg-brand-yellow text-ink",
  purple: "bg-brand-purple text-on-structure",
  burgundy: "bg-brand-burgundy text-on-primary",
};

/** Retardo de intención: un roce del puntero no abre ni cierra el panel. */
const HOVER_OPEN_MS = 120;
const HOVER_CLOSE_MS = 260;

/** Pastilla de color de una subpágina (edad, o un icono si no hay edad). `compact`: menú de móvil (campo oscuro). */
export function NavBadge({ item, compact = false }: { item: NavSubItem; compact?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display leading-none ${(compact && BADGE_ON_DARK[item.tone]) || BADGE[item.tone]} ${
        compact ? "h-7 min-w-12 px-2 text-sm" : "h-8 min-w-14 px-2.5 text-base"
      }`}
    >
      {item.badge ?? (
        item.tone === "neutral" ? (
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10h11M11 5l5 5-5 5" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 16" className="h-3.5 w-4" fill="currentColor">
            <path d="M3 0h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8l-5 4 1-4H3a3 3 0 0 1-3-3V3a3 3 0 0 1 3-3Z" />
          </svg>
        )
      )}
    </span>
  );
}

/**
 * "Clases" y "Recursos" en la cabecera de escritorio (patrón disclosure, no menú ARIA):
 * el texto es un enlace real a /lessons y el botón del chevrón despliega las
 * subpáginas. Se abre con clic, Intro o Espacio y, con ratón, al pasar por
 * encima (con un pequeño retardo). Se cierra con Escape (el foco vuelve al
 * botón), con un clic fuera o cuando el foco sale del grupo.
 */
export function NavDisclosure({
  label,
  href,
  toggleLabel,
  tailClassName = "left-[5.25rem] xl:left-[5.75rem]",
  current,
  items,
}: {
  label: string;
  href: string;
  toggleLabel: string;
  /** Posición de la cola del bocadillo: bajo el chevrón (depende del ancho del texto). */
  tailClassName?: string;
  /** "page" en /lessons; "true" en una subpágina (el grupo está activo). */
  current?: "page" | "true";
  items: NavSubItem[];
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLLIElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const byHover = useRef(false);

  const clearTimer = () => clearTimeout(timer.current);
  const close = useCallback((returnFocus = false) => {
    clearTimeout(timer.current);
    byHover.current = false;
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  useEffect(() => clearTimer, []);

  return (
    <li
      ref={rootRef}
      className="relative flex items-center"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        clearTimer();
        if (!open) {
          timer.current = setTimeout(() => {
            byHover.current = true;
            setOpen(true);
          }, HOVER_OPEN_MS);
        }
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        clearTimer();
        // Solo se cierra solo si se abrió al pasar el ratón; si se abrió con un
        // clic o con el teclado, se queda abierto hasta un clic fuera o Escape.
        if (open && byHover.current) timer.current = setTimeout(() => close(), HOVER_CLOSE_MS);
      }}
      onBlur={(e) => {
        if (open && !rootRef.current?.contains(e.relatedTarget as Node | null)) close();
      }}
    >
      <Link
        href={href}
        aria-current={current}
        className="inline-flex min-h-11 items-center rounded-full py-2 pr-1 pl-3 lg:pl-2 font-semibold whitespace-nowrap text-ink no-underline decoration-brand-fuchsia decoration-[3px] transition-colors duration-200 hover:bg-ink/8 hover:underline aria-[current]:underline xl:pl-3.5"
      >
        {label}
      </Link>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={toggleLabel}
        onClick={() => {
          clearTimer();
          byHover.current = false;
          setOpen((v) => !v);
        }}
        className="-ml-1 inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors duration-200 hover:bg-ink/8 aria-expanded:bg-ink/8"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`size-[1.125rem] transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>

      {/* Bocadillo crema con la extrusión burdeos; la cola apunta al chevrón.
          Cerrado queda `invisible` (fuera del orden de tabulación y del árbol
          accesible) tras la transición de salida. */}
      <div
        id={id}
        data-open={open}
        className="nav-panel absolute top-full left-0 z-40 mt-3 w-[19.5rem]"
        style={{ filter: "drop-shadow(var(--bubble-shadow))" }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a[href]")) close();
        }}
      >
        <svg aria-hidden="true" viewBox="0 0 34 22" className={`absolute -top-[17px] h-[22px] w-[34px] -scale-y-100 text-cream ${tailClassName}`}>
          <path d="M0 0h34C26 6 15 14 2 22c5-8 6-15-2-22Z" fill="currentColor" />
        </svg>
        <ul className="relative flex flex-col gap-0.5 rounded-[1.75rem] border-2 border-ink/10 bg-cream p-2.5">
          {items.map((item, i) => (
            <li key={item.key} className={i === 0 ? "mb-1 border-b-2 border-ink/10 pb-1.5" : undefined}>
              <Link
                href={item.href}
                aria-current={item.current ? "page" : undefined}
                className="group flex min-h-12 items-center gap-3 rounded-2xl px-3 py-1.5 font-semibold text-ink no-underline transition-colors duration-150 hover:bg-ink/8 aria-[current=page]:bg-brand-yellow/35"
              >
                <NavBadge item={item} />
                <span className="decoration-brand-fuchsia decoration-[3px] group-hover:underline group-aria-[current=page]:underline">
                  {item.label}
                </span>
                {item.badge && <span className="sr-only"> ({item.badge})</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

/**
 * "Clases" en el menú de móvil: grupo desplegable (botón con aria-expanded)
 * con las subpáginas sangradas. Abierto de entrada si la página actual es una
 * de ellas.
 */
export function MobileNavGroup({
  label,
  current,
  items,
}: {
  label: string;
  current: boolean;
  items: NavSubItem[];
}) {
  const [open, setOpen] = useState(current);
  const id = useId();

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-md text-left font-display text-2xl ${
          current ? "text-brand-yellow" : "text-on-structure"
        }`}
      >
        {label}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`size-6 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>
      <ul id={id} hidden={!open} className="mb-3 ml-3 flex flex-col border-l-2 border-on-structure/25 pl-4">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className="flex min-h-12 items-center gap-3 rounded-md text-lg font-semibold text-on-structure no-underline aria-[current=page]:text-brand-yellow aria-[current=page]:underline"
            >
              <NavBadge item={item} compact />
              {item.label}
              {item.badge && <span className="sr-only"> ({item.badge})</span>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
