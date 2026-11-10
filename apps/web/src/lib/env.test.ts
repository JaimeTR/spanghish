import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { assertEnv, checkWebEnv, isServiceKey, WEB_ENV_NAMES } from "./env";

const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.firma`;
const ANON = jwt("anon");
const SERVICE = jwt("service_role");
const DEMO = {
  VERCEL: "1",
  VERCEL_ENV: "production",
  SITE_NOINDEX: "1",
  NEXT_PUBLIC_SITE_URL: "https://demo.example.test",
  NEXT_PUBLIC_APP_URL: "https://app.example.test",
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnop.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON,
  WEB_REVALIDATE_SECRET: "s".repeat(32),
};
const problems = (env: Record<string, string | undefined>) => {
  const check = checkWebEnv(env);
  return check.ok ? [] : check.problems;
};

describe("checkWebEnv", () => {
  it("accepts a minimal demo env and warns about missing Resend and Stripe", () => {
    const check = checkWebEnv(DEMO);
    expect(check.ok).toBe(true);
    expect(check.warnings.join("\n")).toMatch(/Resend/);
    expect(check.warnings.join("\n")).toMatch(/Stripe/);
  });

  it("an empty env (today's deployment) only warns: the build goes on with defaults and the fallback", () => {
    const check = checkWebEnv({ VERCEL: "1", VERCEL_ENV: "production" });
    expect(check.ok).toBe(true);
    expect(check.warnings.join("\n")).toMatch(/NEXT_PUBLIC_SITE_URL/);
    expect(check.warnings.join("\n")).toMatch(/respaldo/);
  });

  it("rejects the service role key", () => {
    expect(problems({ ...DEMO, SUPABASE_SERVICE_ROLE_KEY: SERVICE }).join("\n")).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("rejects an anon key whose JWT role is service_role, or a secret key", () => {
    expect(isServiceKey(ANON)).toBe(false);
    expect(isServiceKey("sb_publishable_abc")).toBe(false);
    expect(isServiceKey("sb_secret_abc")).toBe(true);
    expect(problems({ ...DEMO, NEXT_PUBLIC_SUPABASE_ANON_KEY: SERVICE }).join("\n")).toMatch(/clave de servicio/);
    expect(problems({ ...DEMO, NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_secret_abc" }).join("\n")).toMatch(/clave de servicio/);
  });

  it("rejects half of a pair or trio", () => {
    expect(problems({ ...DEMO, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined })).toEqual([expect.stringMatching(/^NEXT_PUBLIC_SUPABASE_ANON_KEY: falta/)]);
    expect(problems({ ...DEMO, STRIPE_SECRET_KEY: "sk_test_x" })).toEqual([expect.stringMatching(/^STRIPE_WEBHOOK_SECRET: falta/)]);
    expect(problems({ ...DEMO, RESEND_API_KEY: "re_x" })).toHaveLength(2);
  });

  it("rejects a short revalidate secret, non-https URLs on Vercel and a live Stripe key in a demo", () => {
    expect(problems({ ...DEMO, WEB_REVALIDATE_SECRET: "corto" }).join("\n")).toMatch(/32 caracteres/);
    expect(problems({ ...DEMO, NEXT_PUBLIC_SITE_URL: "http://demo.example.test" }).join("\n")).toMatch(/https/);
    expect(problems({ NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000" })).toEqual([]);
    expect(problems({ ...DEMO, STRIPE_SECRET_KEY: "sk_live_x", STRIPE_WEBHOOK_SECRET: "whsec_x" }).join("\n")).toMatch(/live/);
  });

  it("rejects LEADS_LOG_ONLY on a real (indexable) production site, but allows it in a demo", () => {
    expect(problems({ ...DEMO, SITE_NOINDEX: undefined, LEADS_LOG_ONLY: "1" }).join("\n")).toMatch(/LEADS_LOG_ONLY/);
    expect(problems({ ...DEMO, LEADS_LOG_ONLY: "1" })).toEqual([]);
  });

  it("problems and warnings never include variable values", () => {
    const secret = "valor-super-secreto-123";
    const check = checkWebEnv({
      ...DEMO,
      SUPABASE_SERVICE_ROLE_KEY: secret,
      WEB_REVALIDATE_SECRET: secret.slice(0, 8),
      STRIPE_SECRET_KEY: `sk_live_${secret}`,
      RESEND_API_KEY: secret,
      NEXT_PUBLIC_SITE_URL: `http://${secret}.test`,
    });
    expect(check.ok).toBe(false);
    expect(JSON.stringify(check)).not.toContain(secret.slice(0, 8));
  });

  it("checks only documented names", () => {
    const source = readFileSync(path.resolve(__dirname, "env.ts"), "utf8");
    const used = new Set([...source.matchAll(/"([A-Z][A-Z0-9_]{3,})"/g)].map((match) => match[1]!));
    for (const name of used) {
      if (name === "VERCEL" || name === "VERCEL_ENV") continue;
      expect(WEB_ENV_NAMES as readonly string[], name).toContain(name);
    }
  });
});

describe("assertEnv", () => {
  it("throws a readable list and prints the warnings", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => assertEnv({ ok: false, problems: ["A: falta."], warnings: ["B: aviso."] }, "web")).toThrow(
      "Variables de entorno de web inválidas:\n- A: falta.",
    );
    expect(warn).toHaveBeenCalledWith("[env web] aviso: B: aviso.");
    expect(() => assertEnv({ ok: true, warnings: [] }, "web")).not.toThrow();
    warn.mockRestore();
  });
});

describe("turbo.json", () => {
  it("the build cache depends on the variables that end up in the build", () => {
    const turbo = JSON.parse(readFileSync(path.resolve(__dirname, "../../../../turbo.json"), "utf8")) as {
      tasks: { build: { env?: string[]; passThroughEnv?: string[] } };
    };
    expect(turbo.tasks.build.env).toEqual(expect.arrayContaining(["NEXT_PUBLIC_*", "SITE_NOINDEX", "VERCEL", "VERCEL_ENV"]));
    // El build valida estas variables: Turbo debe dejarlas pasar (modo estricto) sin que cambien la caché.
    for (const name of WEB_ENV_NAMES) {
      if (name.startsWith("NEXT_PUBLIC_") || name === "SITE_NOINDEX") continue;
      expect(turbo.tasks.build.passThroughEnv, name).toContain(name);
    }
  });
});
