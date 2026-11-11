import { describe, expect, it } from "vitest";
import { parseForm } from "../forms";
import { profileSchema } from "./profile";

const form = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

describe("profileSchema", () => {
  it("acepta solo el nombre y el idioma; el resto es opcional", () => {
    const r = parseForm(profileSchema, form({ fullName: " Ana Ruiz ", preferredLocale: "es", phone: "" }));
    expect(r).toEqual({ ok: true, data: { fullName: "Ana Ruiz", preferredLocale: "es" } });
  });

  it("acepta teléfono con prefijo y fecha válida", () => {
    const r = parseForm(profileSchema, form({ fullName: "Ana", preferredLocale: "en", phone: "+61 400 000 000", birthDate: "1990-05-01" }));
    expect(r.ok).toBe(true);
  });

  it("rechaza nombre vacío, teléfono con letras y fecha futura", () => {
    const r = parseForm(profileSchema, form({ fullName: "", preferredLocale: "es", phone: "abc123", birthDate: "2999-01-01" }));
    expect(r).toMatchObject({ ok: false, fieldErrors: { fullName: "required", phone: "invalid", birthDate: "range" } });
  });
});
