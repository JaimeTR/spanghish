/** Insignia "En desarrollo" / "Datos de ejemplo": amarillo de marca con texto oscuro. */
export function DevBadge({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span
      className={`inline-block rounded-sm bg-highlight px-2 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap text-on-highlight ${className}`}
    >
      {label}
    </span>
  );
}
