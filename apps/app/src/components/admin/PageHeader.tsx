import Link from "next/link";
import type { ReactNode } from "react";
import { linkClass } from "@/components/form-styles";

/** Cabecera de página de administración: volver (opcional), título, intro y acción. */
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
          <p className="mb-2 text-sm">
            <Link href={back.href} className={linkClass}>
              ← {back.label}
            </Link>
          </p>
        ) : null}
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

export const tableClass = "w-full border-collapse text-left text-sm";
export const thClass = "border-b border-line px-3 py-2 font-semibold text-text-muted";
export const tdClass = "border-b border-line px-3 py-3 align-top text-text";
