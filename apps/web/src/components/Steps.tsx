/**
 * Pasos numerados (como "¿Cómo funciona la clase gratis?" de contacto): cifra
 * rotulada, título y texto. En columnas desde `md`, o apilados (`stacked`)
 * cuando van en una columna lateral.
 */
export function Steps({
  items,
  stacked = false,
  headingLevel = 3,
}: {
  items: { key: string; title: string; body: string }[];
  stacked?: boolean;
  headingLevel?: 3 | 4;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  return (
    <ol className={`grid gap-x-8 ${stacked ? "gap-y-6" : "gap-y-10 md:grid-cols-3"}`}>
      {items.map((item, i) => (
        <li key={item.key} className={`border-t-2 border-ink pt-5 ${stacked ? "grid grid-cols-[3rem_1fr] gap-x-3" : ""}`}>
          <span
            aria-hidden="true"
            className={`lettering block font-display leading-none text-brand-fuchsia ${stacked ? "text-[3rem]" : "text-[4.5rem]"}`}
          >
            {i + 1}
          </span>
          <div>
            <Heading className={`${stacked ? "" : "mt-3"} text-xl font-extrabold text-ink`}>{item.title}</Heading>
            {item.body && <p className="mt-1.5 text-lg leading-relaxed text-ink">{item.body}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
