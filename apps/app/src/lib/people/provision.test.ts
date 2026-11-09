import type { Database } from "@spanglish/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { provisionAccount } = await import("./provision");

type Calls = {
  createUser: ReturnType<typeof vi.fn>;
  resetPasswordForEmail: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

function fakeClients(createUserResult: unknown, resetResult: unknown = { data: {}, error: null }) {
  const calls: Calls = {
    createUser: vi.fn().mockResolvedValue(createUserResult),
    resetPasswordForEmail: vi.fn().mockResolvedValue(resetResult),
    update: vi.fn(),
  };
  const eq = vi.fn().mockResolvedValue({ error: null });
  calls.update.mockReturnValue({ eq });
  const admin = {
    auth: { admin: { createUser: calls.createUser } },
    from: vi.fn(() => ({ update: calls.update })),
  } as unknown as SupabaseClient<Database>;
  const auth = {
    auth: { resetPasswordForEmail: calls.resetPasswordForEmail },
  } as unknown as SupabaseClient<Database>;
  return { admin, auth, calls };
}

const INPUT = {
  email: "new.teacher@example.com",
  fullName: "New Teacher",
  initialRole: "teacher" as const,
  locale: "en" as const,
};
const SITE = "https://app.example.com";

describe("provisionAccount", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("provisionAccount puts initial_role in app_metadata and never in user_metadata", async () => {
    const { admin, auth, calls } = fakeClients({ data: { user: { id: "u1" } }, error: null });
    const result = await provisionAccount(INPUT, { admin, auth, siteUrl: SITE });

    expect(result).toEqual({ ok: true, userId: "u1", emailSent: true });
    const arg = calls.createUser.mock.calls[0]![0];
    expect(arg).toEqual({
      email: "new.teacher@example.com",
      email_confirm: true,
      app_metadata: { initial_role: "teacher" },
      user_metadata: { full_name: "New Teacher" },
    });
    expect(JSON.stringify(arg.user_metadata)).not.toContain("role");
    expect(calls.update).toHaveBeenCalledWith({ preferred_locale: "en" });
  });

  it("maps email_exists to 'exists'", async () => {
    const { admin, auth, calls } = fakeClients({
      data: { user: null },
      error: { status: 422, code: "email_exists", message: "already registered" },
    });
    expect(await provisionAccount(INPUT, { admin, auth, siteUrl: SITE })).toEqual({
      ok: false,
      error: "exists",
    });
    expect(calls.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("maps an invalid email to 'invalid' and any other failure to 'unavailable'", async () => {
    const invalid = fakeClients({ data: { user: null }, error: { status: 400, code: "email_address_invalid" } });
    expect(await provisionAccount(INPUT, { ...invalid, siteUrl: SITE })).toEqual({ ok: false, error: "invalid" });
    const down = fakeClients({ data: { user: null }, error: { status: 500, code: "unexpected_failure" } });
    expect(await provisionAccount(INPUT, { ...down, siteUrl: SITE })).toEqual({
      ok: false,
      error: "unavailable",
    });
  });

  it("sends the reset email to /<locale>/reset-password", async () => {
    const { admin, auth, calls } = fakeClients({ data: { user: { id: "u1" } }, error: null });
    await provisionAccount(INPUT, { admin, auth, siteUrl: SITE });
    expect(calls.resetPasswordForEmail).toHaveBeenCalledWith("new.teacher@example.com", {
      redirectTo: "https://app.example.com/en/reset-password",
    });
  });

  it("keeps the account and reports emailSent false when the email cannot be sent", async () => {
    const { admin, auth } = fakeClients(
      { data: { user: { id: "u1" } }, error: null },
      { data: null, error: { status: 429, code: "over_email_send_rate_limit" } },
    );
    expect(await provisionAccount(INPUT, { admin, auth, siteUrl: SITE })).toEqual({
      ok: true,
      userId: "u1",
      emailSent: false,
    });
  });

  it("returns 'unavailable' when the service key is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(await provisionAccount(INPUT, { siteUrl: SITE })).toEqual({ ok: false, error: "unavailable" });
  });
});
