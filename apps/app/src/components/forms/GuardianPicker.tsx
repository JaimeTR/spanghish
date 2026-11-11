"use client";

import { useId, useMemo, useState } from "react";
import { inputClass } from "@/components/form-styles";
import { Field } from "@/components/forms/Field";
import type { FieldErrors } from "@/lib/forms";

export type GuardianOption = { id: string; name: string; email: string; phone: string | null };

type Labels = {
  name: string;
  relationship: string;
  email: string;
  phone: string;
  registered: string;
  newOne: string;
};

type Values = { id?: string; name?: string; email?: string; phone?: string; relationship?: string };

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Tutor del menor en cuatro campos: nombre, relación, correo y teléfono. Al
 * escribir el nombre se sugieren los tutores ya registrados; elegir uno rellena
 * correo y teléfono y envía su id. Si no coincide con ninguno, se registra uno
 * nuevo con lo escrito.
 */
export function GuardianPicker({
  guardians,
  labels,
  relationships,
  values,
  errors,
}: {
  guardians: GuardianOption[];
  labels: Labels;
  relationships: { value: string; label: string }[];
  values: Values;
  errors: FieldErrors<"guardianId" | "guardianFullName" | "guardianEmail" | "guardianPhone" | "guardianRelationship">;
}) {
  const listId = useId();
  const [name, setName] = useState(values.name ?? "");
  const [email, setEmail] = useState(values.email ?? "");
  const [phone, setPhone] = useState(values.phone ?? "");
  const [pickedId, setPickedId] = useState(values.id ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const q = norm(name.trim());
    if (!q || pickedId) return [];
    return guardians.filter((g) => norm(g.name).includes(q)).slice(0, 6);
  }, [guardians, name, pickedId]);

  const pick = (g: GuardianOption) => {
    setName(g.name);
    setEmail(g.email);
    setPhone(g.phone ?? "");
    setPickedId(g.id);
    setOpen(false);
  };

  const onName = (value: string) => {
    setName(value);
    setActive(0);
    setOpen(true);
    if (pickedId) {
      // Cambiar el nombre desvincula al tutor elegido: pasa a ser uno nuevo.
      setPickedId("");
      setEmail("");
      setPhone("");
    }
  };

  const showList = open && matches.length > 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="guardianId" value={pickedId} />
      <div className="relative">
        <Field name="guardianFullName" label={labels.name} error={errors.guardianFullName}>
          <input
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            maxLength={120}
            autoComplete="off"
            value={name}
            onChange={(e) => onName(e.target.value)}
            onBlur={() => setOpen(false)}
            onKeyDown={(e) => {
              if (!showList) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => (i + 1) % matches.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => (i - 1 + matches.length) % matches.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                pick(matches[active]!);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            className={inputClass}
          />
        </Field>
        {showList ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-[0_12px_24px_-8px_rgb(30_18_38/0.28)]"
          >
            {matches.map((g, i) => (
              <li
                key={g.id}
                role="option"
                aria-selected={i === active}
                // mousedown (no click): el input aún tiene el foco y su blur cerraría la lista antes del click.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(g);
                }}
                className={`cursor-pointer rounded-sm px-3 py-2 text-sm ${i === active ? "bg-highlight text-on-highlight" : "text-text hover:bg-surface-sunken"}`}
              >
                <span className="font-semibold">{g.name}</span>
                <span className="block truncate opacity-80">{g.email}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-1 text-sm text-text-muted" role="status">
          {name.trim() ? (pickedId ? labels.registered : labels.newOne) : ""}
        </p>
      </div>
      <Field name="guardianRelationship" label={labels.relationship} error={errors.guardianRelationship}>
        <select defaultValue={values.relationship ?? "parent"} className={inputClass}>
          {relationships.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>
      <Field name="guardianEmail" label={labels.email} error={errors.guardianEmail}>
        <input
          type="email"
          maxLength={254}
          autoComplete="off"
          value={email}
          readOnly={Boolean(pickedId)}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field name="guardianPhone" label={labels.phone} error={errors.guardianPhone}>
        <input
          type="tel"
          maxLength={30}
          autoComplete="off"
          value={phone}
          readOnly={Boolean(pickedId)}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
      </Field>
    </div>
  );
}
