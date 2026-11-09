import { Field } from "@/components/forms/Field";
import type { FormErrorKey } from "@/lib/forms";

export function BilingualField({ name, label, hint, errors, defaultValues, multiline = false, maxLength }: {
  name: string; label: string; hint?: string; errors: Partial<Record<string, FormErrorKey>>;
  defaultValues?: { es?: string | null; en?: string | null }; multiline?: boolean; maxLength: number;
}) {
  const Control = multiline ? "textarea" : "input";
  return <fieldset className="grid gap-4 md:grid-cols-2"><legend className="mb-2 font-semibold">{label}</legend>
    {(["Es", "En"] as const).map((suffix) => {
      const lang = suffix === "Es" ? "es" : "en"; const key = `${name}${suffix}`;
      return <Field key={key} name={key} label={lang === "es" ? "Español" : "English"} hint={hint} error={errors[key]}>
        <Control lang={lang} maxLength={maxLength} defaultValue={defaultValues?.[lang] ?? ""} className="w-full rounded border border-line bg-surface px-3 py-2" />
      </Field>;
    })}</fieldset>;
}
