import { describe, expect, it } from "vitest";
import { validateContact } from "./contact";

const form = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
const valid = { name: "Sam", email: "SAM@Example.com", phone: "", message: "Hola\r\nQué tal", consent: "yes" };

describe("validateContact", () => {
  it("accepts a valid message and cleans it", () => {
    const r = validateContact(form(valid));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toMatchObject({ email: "sam@example.com", message: "Hola\nQué tal", phone: "" });
  });
  it("requires name, email, message and consent; phone is optional", () => {
    const r = validateContact(form({}));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["consent", "email", "message", "name"]);
  });
  it("rejects a bad email and a bad phone, and too-long text", () => {
    const r = validateContact(form({ ...valid, email: "sam@", phone: "abc", message: "x".repeat(2001) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toMatchObject({ email: "email", phone: "phone", message: "tooLong" });
  });
});
