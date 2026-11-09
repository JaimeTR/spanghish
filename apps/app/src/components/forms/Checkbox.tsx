/**
 * Casilla con su etiqueta clicable (objetivo táctil de 44px). Envía "on" si
 * está marcada. `errorText` la marca inválida y la describe con el mensaje.
 */
export function Checkbox({
  name,
  label,
  defaultChecked,
  hint,
  errorText,
  idPrefix = "field-",
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: string;
  errorText?: string;
  idPrefix?: string;
}) {
  const id = `${idPrefix}${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errorText ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-text">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          aria-invalid={errorText ? true : undefined}
          aria-describedby={describedBy}
          className="size-5 shrink-0 accent-structure focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
        />
        <span className="font-semibold">{label}</span>
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
      {errorText ? (
        <p id={errorId} className="text-sm font-semibold text-danger">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
