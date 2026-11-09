import { describe, expect, it } from "vitest";
import { DOMAIN_ERRORS, toDomainError } from "./db-errors";

describe("toDomainError", () => {
  it("toDomainError maps P0001 group_full", () => {
    expect(toDomainError({ code: "P0001", message: "group_full" })).toBe("group_full");
  });

  it("maps 42501 to forbidden", () => {
    expect(toDomainError({ code: "42501", message: "permission denied for table groups" })).toBe(
      "forbidden",
    );
  });

  it("maps 23505 on enrollments_seat_unique to already_enrolled", () => {
    expect(
      toDomainError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "enrollments_seat_unique"',
      }),
    ).toBe("already_enrolled");
  });

  it("maps 23505 on sessions_group_starts_unique to slot_taken", () => {
    expect(
      toDomainError({
        code: "23505",
        message: "duplicate key value",
        details: 'constraint "sessions_group_starts_unique"',
      }),
    ).toBe("slot_taken");
  });

  it("maps any other 23505 to conflict", () => {
    expect(toDomainError({ code: "23505", message: 'violates unique constraint "x_key"' })).toBe(
      "conflict",
    );
  });

  it("maps unknown P0001 messages to unknown", () => {
    expect(toDomainError({ code: "P0001", message: "something else" })).toBe("unknown");
    expect(toDomainError({ code: "P0001", message: "unknown" })).toBe("unknown");
  });

  it("maps PostgREST 'no rows' to not_found", () => {
    expect(toDomainError({ code: "PGRST116", message: "JSON object requested" })).toBe("not_found");
  });

  it("maps null and unknown codes to unknown", () => {
    expect(toDomainError(null)).toBe("unknown");
    expect(toDomainError({ code: "XX000", message: "boom" })).toBe("unknown");
  });

  it("lists every contract code plus unknown", () => {
    expect(DOMAIN_ERRORS).toContain("last_admin");
    expect(DOMAIN_ERRORS).toContain("lead_already_converted");
    expect(DOMAIN_ERRORS).toContain("unknown");
    expect(new Set(DOMAIN_ERRORS).size).toBe(DOMAIN_ERRORS.length);
    expect(DOMAIN_ERRORS).toHaveLength(20);
  });
});
