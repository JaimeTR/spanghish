import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { DOMAIN_ERRORS } from "../lib/db-errors";
import { FORM_ERROR_KEYS } from "../lib/forms";

function keys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    keys(v, prefix ? `${prefix}.${k}` : k),
  );
}

function lookup(messages: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined),
      messages,
    );
}

describe("messages", () => {
  it("es and en messages have identical keys", () => {
    expect(keys(en).sort()).toEqual(keys(es).sort());
  });

  it("every DomainError has a message in es and en", () => {
    for (const code of DOMAIN_ERRORS) {
      for (const messages of [es, en]) {
        const text = lookup(messages, `errors.domain.${code}`);
        expect(typeof text, code).toBe("string");
        expect((text as string).length, code).toBeGreaterThan(0);
      }
    }
  });

  it("every form error key has a message in es and en", () => {
    for (const key of FORM_ERROR_KEYS) {
      for (const messages of [es, en]) {
        expect(typeof lookup(messages, `forms.errors.${key}`), key).toBe("string");
      }
    }
  });
});
