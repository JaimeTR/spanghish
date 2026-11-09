/** Casilla con su etiqueta clicable (objetivo táctil de 44px). Envía "on" si está marcada. */
export function Checkbox({
  name,
  label,
  defaultChecked,
  hint,
  idPrefix = "field-",
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: string;
  idPrefix?: string;
}) {
  const id = `${idPrefix}${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-text">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          aria-describedby={hintId}
          className="size-5 accent-structure focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
        />
        <span className="font-semibold">{label}</span>
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
