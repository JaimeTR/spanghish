import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseForm } from "./forms";

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const schema = z.object({
  name: z.string().trim().min(1).max(5),
  note: z.string().max(10).optional(),
  email: z.email().optional(),
  url: z.url().optional(),
  count: z.coerce.number().int().min(1).max(20).optional(),
});

describe("parseForm", () => {
  it("parseForm maps empty strings to undefined", () => {
    const r = parseForm(schema, form({ name: "Ana", note: "", email: "   " }));
    expect(r).toEqual({ ok: true, data: { name: "Ana" } });
  });

  it("parseForm returns 'tooLong' for max violations", () => {
    const r = parseForm(schema, form({ name: "Demasiado largo" }));
    expect(r).toEqual({ ok: false, fieldErrors: { name: "tooLong" } });
  });

  it("returns 'required' for a missing required field", () => {
    const r = parseForm(schema, form({ name: "" }));
    expect(r).toEqual({ ok: false, fieldErrors: { name: "required" } });
  });

  it("maps email, url and number errors", () => {
    const r = parseForm(schema, form({ name: "Ana", email: "x", url: "nope", count: "abc" }));
    expect(r).toEqual({
      ok: false,
      fieldErrors: { email: "email", url: "url", count: "number" },
    });
  });

  it("maps numeric bounds to 'range'", () => {
    const r = parseForm(schema, form({ name: "Ana", count: "50" }));
    expect(r).toEqual({ ok: false, fieldErrors: { count: "range" } });
  });

  it("parses a coerced number", () => {
    const r = parseForm(schema, form({ name: "Ana", count: "8" }));
    expect(r).toEqual({ ok: true, data: { name: "Ana", count: 8 } });
  });
});
