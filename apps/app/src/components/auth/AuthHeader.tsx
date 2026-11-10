/** Cabecera común de las pantallas de acceso: etiqueta, título (único h1) y texto de apoyo. */
export function AuthHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <header>
      <p className="inline-flex rounded-full bg-brand-yellow/40 px-3 py-1 text-xs font-bold tracking-wide text-ink uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-lilita)] text-3xl leading-tight text-structure sm:text-4xl">{title}</h1>
      {intro && <p className="mt-2 text-text-muted">{intro}</p>}
    </header>
  );
}
