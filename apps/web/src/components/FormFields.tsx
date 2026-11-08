
export const fieldBase =
  "block w-full rounded-[1rem] border-2 bg-surface px-4 py-3 text-lg text-ink transition-colors duration-200 hover:border-brand-purple";
export const fieldOk = "border-ink/35";
export const fieldBad = "border-danger";

export function ErrorText({ field, text }: { field: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={`f-${field}-error`} className="mt-2 font-semibold text-danger">
      {text}
    </p>
  );
}

export function Label({ htmlFor, label, optional }: { htmlFor: string; label: string; optional?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-lg font-extrabold text-ink">
      {label}
      {optional && <span className="font-semibold text-ink-muted"> {optional}</span>}
    </label>
  );
}

export function TextField({
  field,
  label,
  optional,
  hint,
  error,
  describedBy,
  multiline = false,
  rows,
  type = "text",
  autoComplete,
  value,
  onChange,
  maxLength,
}: {
  field: string;
  label: string;
  optional?: string;
  hint?: string;
  error?: string;
  describedBy?: string;
  multiline?: boolean;
  rows?: number;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  value: string;
  onChange: (e: { target: HTMLInputElement | HTMLTextAreaElement }) => void;
  maxLength: number;
}) {
  const id = `f-${field}`;
  const common = {
    id,
    name: field,
    value,
    onChange,
    maxLength,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: `${fieldBase} ${error ? fieldBad : fieldOk} mt-2`,
  };
  return (
    <div>
      <Label htmlFor={id} label={label} optional={optional} />
      {hint && (
        <p id={`${id}-hint`} className="mt-0.5 text-ink-muted">
          {hint}
        </p>
      )}
      {multiline ? (
        <textarea {...common} rows={rows} autoComplete="off" />
      ) : (
        <input {...common} type={type} autoComplete={autoComplete} spellCheck={type === "text" ? undefined : false} />
      )}
      <ErrorText field={field} text={error} />
    </div>
  );
}

export function ChoiceField({
  field,
  label,
  hint,
  options,
  value,
  onChange,
  error,
  describedBy,
}: {
  field: string;
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (e: { target: HTMLInputElement }) => void;
  error?: string;
  describedBy?: string;
}) {
  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="text-lg font-extrabold text-ink">{label}</legend>
      {hint && (
        <p id={`f-${field}-hint`} className="mt-0.5 text-ink-muted">
          {hint}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => {
          const id = `f-${field}-${o.value}`;
          return (
            <label
              key={o.value}
              htmlFor={id}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-full border-2 bg-surface px-4 py-2 font-semibold text-ink transition-colors duration-200 hover:border-brand-purple has-[:checked]:border-brand-purple has-[:checked]:bg-brand-purple has-[:checked]:text-on-structure has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-[var(--focus-color)] ${
                error ? fieldBad : "border-ink/20"
              }`}
            >
              <input
                id={id}
                type="radio"
                name={field}
                value={o.value}
                checked={value === o.value}
                onChange={onChange}
                className="size-5 shrink-0 accent-brand-yellow focus-visible:outline-none"
              />
              {o.label}
            </label>
          );
        })}
      </div>
      <ErrorText field={field} text={error} />
    </fieldset>
  );
}
