import type { ReactNode } from "react";

/**
 * Piezas de página compartidas por las áreas del portal (docente, alumno, tutor): el contenedor
 * centrado, la cabecera de color y el aviso de "no hay nada todavía". Usarlas en vez de repetir
 * las mismas clases en cada página.
 */
const WIDTHS = { md: "max-w-4xl", lg: "max-w-6xl" } as const;

/** Contenedor centrado de una página de área (no el de administración, que ya lo trae el shell). */
export function PageContainer({ size = "md", children }: { size?: keyof typeof WIDTHS; children: ReactNode }) {
  return <div className={`mx-auto w-full ${WIDTHS[size]} px-4 py-8 sm:px-6`}>{children}</div>;
}

/** Cabecera de color de una página: sobretítulo, título y una línea de contexto. */
export function HeroHeader({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: string }) {
  return (
    <header className="rounded-[var(--shape-lg)] bg-structure p-6 text-on-structure">
      {eyebrow ? <p className="text-sm font-semibold">{eyebrow}</p> : null}
      <h1 className={`${eyebrow ? "mt-1 " : ""}text-3xl font-extrabold`}>{title}</h1>
      {lead ? <p className="mt-3 text-lg">{lead}</p> : null}
    </header>
  );
}

/** "Todavía no hay nada": un texto sobre fondo hundido. */
export function EmptyState({ children, className = "mt-8" }: { children: ReactNode; className?: string }) {
  return <p className={`${className} rounded-xl bg-surface-sunken p-4 text-text-muted`}>{children}</p>;
}

/** Sección con título y lista/contenido, con la etiqueta ligada para lectores de pantalla. */
export function ListSection({ id, title, children, className = "mt-10" }: { id: string; title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={className}>
      <h2 id={id} className="text-xl font-bold text-text">
        {title}
      </h2>
      {children}
    </section>
  );
}
