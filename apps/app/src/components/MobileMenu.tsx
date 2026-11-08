"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { onLightFocus } from "./shell-styles";

/**
 * Menú desplegable de móvil (patrón disclosure, no modal): el botón alterna un
 * panel bajo la barra superior. Al abrir, el foco va al primer enlace; Escape,
 * un clic fuera o elegir un enlace lo cierran y el foco vuelve al botón.
 * Oculto desde `lg`, donde la barra lateral está siempre visible.
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
        className={`-ml-2 inline-flex size-11 items-center justify-center rounded-md text-structure hover:bg-surface-sunken lg:hidden ${onLightFocus}`}
      >
        {open ? (
          <X aria-hidden="true" className="size-6" strokeWidth={2} />
        ) : (
          <Menu aria-hidden="true" className="size-6" strokeWidth={2} />
        )}
        <span className="sr-only">{label}</span>
      </button>
      {open && (
        // Velo bajo la barra: separa el menú del contenido; un toque fuera lo cierra.
        <div aria-hidden="true" className="fixed inset-x-0 top-16 bottom-0 bg-ink/40 lg:hidden" />
      )}
      {open && (
        <div
          ref={panelRef}
          id={id}
          // Cerrar al elegir un enlace (la navegación es del lado del cliente).
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a[href]")) setOpen(false);
          }}
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto bg-structure px-4 pt-4 pb-6 text-on-structure shadow-[0_12px_24px_-8px_rgb(30_18_38/0.35)] lg:hidden"
        >
          {children}
        </div>
      )}
    </>
  );
}
