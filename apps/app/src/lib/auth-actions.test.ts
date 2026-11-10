import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetSchema } from "./schemas/auth";

const cookieStore = { set: vi.fn(), delete: vi.fn() };
const createClientSpy = vi.fn();
const supabase = {
  auth: {
    signInWithPassword: vi.fn(),
    verifyOtp: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  },
};
const redirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT:${to}`);
});
const loadSessionUser = vi.fn();

vi.mock("./supabase/server", () => ({
  createClient: (...args: unknown[]) => {
    createClientSpy(...args);
    return Promise.resolve(supabase);
  },
}));
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(cookieStore) }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));
vi.mock("./load-session-user", () => ({ loadSessionUser: () => loadSessionUser() }));

const { login, updatePassword } = await import("./auth-actions");

const TOKEN = "pkce_0123456789abcdef0123456789";

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

describe("login: mantener la sesión iniciada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });
    loadSessionUser.mockResolvedValue({ id: "u1", status: "active", roles: ["admin"], locale: "es" });
  });
  const credentials = { locale: "es", email: "admin@example.test", password: "una-clave-larga" };

  it("remembered: persistent cookies and the session-only preference is cleared", async () => {
    await expect(login({}, form({ ...credentials, remember: "1" }))).rejects.toThrow("NEXT_REDIRECT:/es/admin");
    expect(createClientSpy).toHaveBeenCalledWith({ sessionOnly: false });
    expect(cookieStore.delete).toHaveBeenCalledWith("sp_session_only");
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("not remembered (box unchecked or absent): session cookies and a session-only preference cookie", async () => {
    await expect(login({}, form(credentials))).rejects.toThrow("NEXT_REDIRECT:/es/admin");
    expect(createClientSpy).toHaveBeenCalledWith({ sessionOnly: true });
    expect(cookieStore.set).toHaveBeenCalledWith(
      "sp_session_only",
      "1",
      expect.objectContaining({ path: "/", httpOnly: true, sameSite: "lax" }),
    );
    const options = cookieStore.set.mock.calls[0]![2] as Record<string, unknown>;
    expect(options.maxAge).toBeUndefined();
    expect(options.expires).toBeUndefined();
    expect(cookieStore.delete).not.toHaveBeenCalled();
  });

  it("a failed sign-in leaves the preference untouched", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: { status: 400 } });
    expect(await login({}, form({ ...credentials, remember: "1" }))).toEqual({ error: "credentials" });
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(cookieStore.delete).not.toHaveBeenCalled();
  });
});

describe("resetSchema", () => {
  it("resetSchema rejects passwords shorter than 10", () => {
    const r = resetSchema.safeParse({ tokenHash: TOKEN, password: "123456789", confirm: "123456789" });
    expect(r.success).toBe(false);
  });

  it("accepts a 10-character password with a matching confirmation", () => {
    const r = resetSchema.safeParse({ tokenHash: TOKEN, password: "1234567890", confirm: "1234567890" });
    expect(r.success).toBe(true);
  });

  it("rejects passwords longer than 72", () => {
    const long = "x".repeat(73);
    expect(resetSchema.safeParse({ tokenHash: TOKEN, password: long, confirm: long }).success).toBe(false);
  });
});

describe("updatePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });
  });

  it("rejects confirm mismatch as 'mismatch' without spending the token", async () => {
    const state = await updatePassword(
      { status: "idle" },
      form({ locale: "es", tokenHash: TOKEN, password: "una-clave-larga", confirm: "otra-clave-larga" }),
    );
    expect(state).toEqual({ status: "mismatch" });
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("returns 'invalid' for a short password without spending the token", async () => {
    const state = await updatePassword(
      { status: "idle" },
      form({ locale: "es", tokenHash: TOKEN, password: "corta", confirm: "corta" }),
    );
    expect(state).toEqual({ status: "invalid" });
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("updatePassword returns expired when verifyOtp fails", async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: { status: 403, code: "otp_expired" } });
    const state = await updatePassword(
      { status: "idle" },
      form({ locale: "es", tokenHash: TOKEN, password: "una-clave-larga", confirm: "una-clave-larga" }),
    );
    expect(state).toEqual({ status: "expired" });
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: TOKEN });
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("returns 'unavailable' and signs out when updateUser fails", async () => {
    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: { status: 422, code: "same_password" } });
    const state = await updatePassword(
      { status: "idle" },
      form({ locale: "es", tokenHash: TOKEN, password: "una-clave-larga", confirm: "una-clave-larga" }),
    );
    expect(state).toEqual({ status: "unavailable" });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("redirects to the role home after a successful change", async () => {
    loadSessionUser.mockResolvedValue({ id: "u", roles: ["teacher"], status: "active", locale: "es" });
    await expect(
      updatePassword(
        { status: "idle" },
        form({ locale: "en", tokenHash: TOKEN, password: "una-clave-larga", confirm: "una-clave-larga" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/en/teacher");
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "una-clave-larga" });
  });

  it("sends a suspended account to the login with the suspended message", async () => {
    loadSessionUser.mockResolvedValue({ id: "u", roles: [], status: "suspended", locale: "es" });
    await expect(
      updatePassword(
        { status: "idle" },
        form({ locale: "es", tokenHash: TOKEN, password: "una-clave-larga", confirm: "una-clave-larga" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/es/login?error=suspended");
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
