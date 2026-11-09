import { describe, expect, it } from "vitest";
import { parseForm } from "../forms";
import { inviteTeacherSchema, suspendAccountSchema } from "./people";

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

describe("inviteTeacherSchema", () => {
  it("inviteTeacherSchema rejects an empty name", () => {
    const r = parseForm(inviteTeacherSchema, form({ email: "t@example.com", fullName: "   ", locale: "es" }));
    expect(r).toEqual({ ok: false, fieldErrors: { fullName: "required" } });
  });

  it("normalises the email and accepts both locales", () => {
    const r = parseForm(
      inviteTeacherSchema,
      form({ email: "  Teacher@Example.COM ", fullName: " Pamela Rojas ", locale: "en" }),
    );
    expect(r).toEqual({
      ok: true,
      data: { email: "teacher@example.com", fullName: "Pamela Rojas", locale: "en" },
    });
  });

  it("rejects an invalid email and an unknown locale", () => {
    const r = parseForm(inviteTeacherSchema, form({ email: "nope", fullName: "Ana", locale: "fr" }));
    expect(r).toEqual({ ok: false, fieldErrors: { email: "email", locale: "invalid" } });
  });
});

describe("suspendAccountSchema", () => {
  it("accepts a uuid and a boolean flag", () => {
    const r = suspendAccountSchema.safeParse({
      userId: "a0000000-0000-4000-8000-000000000001",
      suspended: "true",
    });
    expect(r.success).toBe(true);
  });

  it("rejects anything that is not a uuid", () => {
    expect(suspendAccountSchema.safeParse({ userId: "1 or 1=1", suspended: "true" }).success).toBe(false);
  });
});
