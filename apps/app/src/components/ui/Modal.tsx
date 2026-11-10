"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { buttonLinkClass } from "@/components/admin/PageHeader";
import { IconButton } from "./IconButton";

const sizes = { md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" } as const;

/** Quita `?new=1` de la barra de direcciones al cerrar (la página "nuevo" abre el modal por ahí). */
function dropNewParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("new")) return;
  url.searchParams.delete("new");
  window.history.replaceState(null, "", url);
}

/**
 * Botón que abre un formulario en un modal (elemento <dialog> nativo: el resto
 * de la página queda inerte, Escape lo cierra y el foco vuelve al botón). El
 * contenido solo se monta mientras está abierto, así cada apertura empieza con
 * el formulario limpio. Se cierra con el icono ✕, Escape o pulsando fuera, y
 * también al navegar (p. ej. tras guardar y redirigir): "abierto" es válido solo
 * para la dirección en la que se abrió.
 */
export function ModalButton({
  label,
  title,
  icon,
  iconOnly = false,
  size = "lg",
  defaultOpen = false,
  children,
}: {
  /** Texto del botón que abre el modal. */
  label: string;
  /** Título del modal (por defecto, el mismo texto). */
  title?: string;
  icon?: ReactNode;
  /** Solo icono (el texto pasa a nombre accesible y tooltip). */
  iconOnly?: boolean;
  size?: keyof typeof sizes;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("shell");
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = `${pathname}?${search}`;
  const [openAt, setOpenAt] = useState<string | null>(defaultOpen ? here : null);
  const open = openAt === here;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const glyph = icon ?? <Plus aria-hidden="true" className="size-5" strokeWidth={2.25} />;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    // El fondo no se desplaza mientras el modal está abierto.
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      {iconOnly ? (
        <IconButton label={label} icon={glyph} onClick={() => setOpenAt(here)} aria-haspopup="dialog" />
      ) : (
        <button type="button" aria-haspopup="dialog" onClick={() => setOpenAt(here)} className={buttonLinkClass}>
          {glyph}
          {label}
        </button>
      )}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => {
          setOpenAt(null);
          dropNewParam();
        }}
        onClick={(event) => {
          // Un clic en el velo (el propio <dialog>, que no tiene relleno) lo cierra.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className={`m-auto w-[calc(100%-1.5rem)] ${sizes[size]} max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-lg border border-line bg-surface p-0 text-text shadow-[0_30px_80px_-20px_rgb(30_18_38/0.5)] backdrop:bg-ink/55 backdrop:backdrop-blur-[2px] open:flex open:flex-col`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          <h2 id={titleId} className="text-lg font-bold text-text">
            {title ?? label}
          </h2>
          <IconButton label={t("close")} icon={<X className="size-5" strokeWidth={2} />} onClick={() => dialogRef.current?.close()} />
        </div>
        <div className="overflow-y-auto px-5 py-5 [&_form]:mt-0">{open ? children : null}</div>
      </dialog>
    </>
  );
}
