import { describe, expect, it } from "vitest";
import { parseForm } from "../forms";
import {
  consentTextSchema,
  inviteTeacherSchema,
  parseStudentForm,
  studentSchema,
  suspendAccountSchema,
} from "./people";

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

function without(values: Record<string, string>, key: string): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([k]) => k !== key));
}

describe("studentSchema", () => {
  const kid = {
    fullName: "Kid",
    audience: "kids",
    preferredLocale: "es",
    guardianFullName: "Mamá",
    guardianEmail: "mama@example.com",
    guardianRelationship: "parent",
    consentTextId: "minor_data-v1",
    consentMethod: "paper",
    consentGranted: "on",
  };

  it("kidSchema requires a guardian email", () => {
    const r = parseStudentForm(form(without(kid, "guardianEmail")));
    expect(r).toEqual({ ok: false, fieldErrors: { guardianEmail: "required" } });
  });

  it("kidSchema requires a consent text", () => {
    expect(parseStudentForm(form(without(kid, "consentTextId")))).toEqual({ ok: false, fieldErrors: { consentTextId: "required" } });
  });

  it("reports the missing guardian together with other errors", () => {
    const r = parseStudentForm(form(without(without(kid, "guardianEmail"), "consentGranted")));
    expect(r).toEqual({ ok: false, fieldErrors: { guardianEmail: "required", consentGranted: "required" } });
  });

  it("kidSchema requires the consent to be confirmed", () => {
    expect(parseStudentForm(form(without(kid, "consentGranted")))).toEqual({ ok: false, fieldErrors: { consentGranted: "required" } });
  });

  it("an existing guardian replaces the new guardian fields", () => {
    const r = parseStudentForm(
      form({
        fullName: "Kid",
        audience: "kids",
        preferredLocale: "en",
        guardianId: "b0000000-0000-4000-8000-000000000501",
        consentTextId: "minor_data-v1",
        consentMethod: "email",
        consentGranted: "on",
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("adult schema ignores guardian fields", () => {
    const r = parseStudentForm(
      form({
        fullName: " Ana ",
        audience: "mature",
        preferredLocale: "es",
        email: "ANA@example.com",
        birthYear: "1955",
        guardianEmail: "not-checked",
        consentTextId: "x",
      }),
    );
    expect(r).toEqual({
      ok: true,
      data: { fullName: "Ana", audience: "mature", preferredLocale: "es", email: "ana@example.com", birthYear: 1955 },
    });
    expect(studentSchema.safeParse({ fullName: "Ana", audience: "adults", preferredLocale: "es" }).success).toBe(true);
  });

  it("an unknown audience is invalid", () => {
    expect(parseStudentForm(form({ fullName: "X", audience: "teens", preferredLocale: "es" }))).toEqual({
      ok: false,
      fieldErrors: { audience: "invalid" },
    });
  });
});

describe("consentTextSchema", () => {
  it("requires both bodies and a date", () => {
    expect(
      parseForm(consentTextSchema, form({ kind: "minor_data", bodyEs: "Texto", effectiveFrom: "2026-11-09" })),
    ).toEqual({ ok: false, fieldErrors: { bodyEn: "required" } });
  });
});
