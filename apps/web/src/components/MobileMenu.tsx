"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Menú de móvil (patrón disclosure, no modal). Al abrir, el foco va al primer
 * enlace; Escape, un toque fuera o elegir un enlace lo cierran y, con Escape,
 * el foco vuelve al botón. Oculto desde `lg`, donde la navegación está a la vista.
 */
export function MobileMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a[href], button")?.focus();

    const close = (returnFocus: boolean) => {
      setOpen(false);
      if (returnFocus) buttonRef.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-cream lg:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          {open ? (
            <path d="M5 5l10 10M15 5L5 15" />
          ) : (
            <path d="M3 6h14M3 10h14M3 14h9" />
          )}
        </svg>
        {label}
      </button>
      {open && <div aria-hidden="true" className="fixed inset-x-0 top-[4.5rem] bottom-0 bg-ink/45 lg:hidden" />}
      <div
        ref={panelRef}
        id={id}
        hidden={!open}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a[href]")) setOpen(false);
        }}
        className="on-dark absolute inset-x-0 top-full max-h-[calc(100dvh-4.5rem)] overflow-y-auto rounded-b-[1.75rem] bg-structure px-4 pt-3 pb-6 text-on-structure shadow-[0_18px_30px_-12px_rgb(30_18_38/0.45)] lg:hidden"
      >
        {children}
      </div>
    </>
  );
}
