import { ArrowLeft, ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { IconLink } from "@/components/ui/IconButton";
import { thClass } from "./table-styles";

/** Cabecera de página de administración: volver (solo icono), título, intro y acción. */
export function PageHeader({
  title,
  intro,
  back,
  action,
}: {
  title: string;
  intro?: string;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back ? (
          <div className="mb-1 -ml-2.5">
            <IconLink href={back.href} label={back.label} icon={<ArrowLeft className="size-5" strokeWidth={2} />} />
          </div>
        ) : null}
        {typeof title === "string" ? <title>{`${title} · Spanglish`}</title> : null}
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-text">{title}</h1>
        {intro ? <p className="mt-1.5 max-w-[65ch] text-text-muted">{intro}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/** Enlace con aspecto de botón primario (acciones que llevan a otra página). */
export const buttonLinkClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2 font-semibold " +
  "text-on-primary hover:bg-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 " +
  "focus-visible:outline-brand-purple";

/** Sección con título dentro de una página de administración. */
export function Section({
  id,
  title,
  children,
  action,
}: {
  id: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-8 rounded-md border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 id={id} className="text-base font-semibold text-text">
          {title}
        </h2>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/** Aviso persistente (resultado tras una redirección). */
export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  return (
    <p
      role="status"
      className={`mt-6 rounded-md border px-4 py-3 text-sm ${
        tone === "warning" ? "border-danger text-text" : "border-line bg-surface text-text"
      }`}
    >
      {children}
    </p>
  );
}

export { tableClass, tdClass, thClass } from "./table-styles";

/** Tarjeta que envuelve una tabla de escritorio (en móvil se usa la lista de tarjetas). */
export function TableCard({ children }: { children: ReactNode }) {
  return <div className="mt-6 hidden overflow-x-auto rounded-lg border border-line bg-surface md:block">{children}</div>;
}

const badgeTones = {
  success: "bg-success/12 text-success",
  muted: "bg-ink/8 text-text-muted",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/12 text-info",
} as const;

/** Estado en forma de insignia (texto siempre visible, además del color). */
export function StatusBadge({ tone = "muted", children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

/** Celda de acciones de una fila: solo iconos, alineados a la derecha. */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-0.5">{children}</div>;
}

/**
 * Encabezado de columna ordenable: enlace (funciona sin JS) que alterna el
 * orden y marca la columna activa con una flecha; `aria-sort` lo dice a los
 * lectores de pantalla.
 */
export function SortableTh({
  href,
  active,
  direction,
  children,
}: {
  href: string;
  active: boolean;
  direction: "asc" | "desc";
  children: ReactNode;
}) {
  const Icon = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined} className={thClass}>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 rounded-sm uppercase hover:text-text focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
      >
        {children}
        <Icon aria-hidden="true" className={`size-3.5 ${active ? "text-structure" : "opacity-60"}`} strokeWidth={2.25} />
      </Link>
    </th>
  );
}
