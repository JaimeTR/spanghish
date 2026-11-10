import { describe, expect, it } from "vitest";
import { assertEnv, checkAppEnv } from "./env";

const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.firma`;
const DEMO = {
  VERCEL: "1",
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnop.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("anon"),
  NEXT_PUBLIC_SITE_URL: "https://app.example.test",
  NEXT_PUBLIC_WEB_URL: "https://demo.example.test",
  SUPABASE_SERVICE_ROLE_KEY: jwt("service_role"),
  WEB_REVALIDATE_URL: "https://demo.example.test/api/revalidate",
  WEB_REVALIDATE_SECRET: "s".repeat(32),
};
const problems = (env: Record<string, string | undefined>) => {
  const check = checkAppEnv(env);
  return check.ok ? [] : check.problems;
};

describe("checkAppEnv", () => {
  it("accepts a complete demo env without warnings", () => {
    expect(checkAppEnv(DEMO)).toEqual({ ok: true, warnings: [] });
  });

  it("requires the Supabase pair and the site URL everywhere", () => {
    expect(problems({})).toEqual([
      expect.stringMatching(/^NEXT_PUBLIC_SUPABASE_URL: falta/),
      expect.stringMatching(/^NEXT_PUBLIC_SUPABASE_ANON_KEY: falta/),
      expect.stringMatching(/^NEXT_PUBLIC_SITE_URL: falta/),
    ]);
  });

  it("requires the service key on Vercel and only warns elsewhere", () => {
    expect(problems({ ...DEMO, SUPABASE_SERVICE_ROLE_KEY: undefined })).toEqual([expect.stringMatching(/^SUPABASE_SERVICE_ROLE_KEY: falta/)]);
    const local = checkAppEnv({ ...DEMO, VERCEL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined });
    expect(local.ok).toBe(true);
    expect(local.warnings.join("\n")).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("rejects a service key where the public key goes", () => {
    expect(problems({ ...DEMO, NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("service_role") }).join("\n")).toMatch(/clave de servicio/);
    expect(problems({ ...DEMO, NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_secret_abc" }).join("\n")).toMatch(/clave de servicio/);
    expect(problems({ ...DEMO, NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_abc" })).toEqual([]);
  });

  it("rejects half of the revalidate pair, a wrong URL and a short secret", () => {
    expect(problems({ ...DEMO, WEB_REVALIDATE_SECRET: undefined })).toEqual([expect.stringMatching(/^WEB_REVALIDATE_SECRET: falta/)]);
    expect(problems({ ...DEMO, WEB_REVALIDATE_URL: undefined })).toEqual([expect.stringMatching(/^WEB_REVALIDATE_URL: falta/)]);
    expect(problems({ ...DEMO, WEB_REVALIDATE_URL: "https://demo.example.test/" }).join("\n")).toMatch(/api\/revalidate/);
    expect(problems({ ...DEMO, WEB_REVALIDATE_URL: "http://demo.example.test/api/revalidate" }).join("\n")).toMatch(/api\/revalidate/);
    expect(problems({ ...DEMO, WEB_REVALIDATE_SECRET: "corto" }).join("\n")).toMatch(/32 caracteres/);
    const local = { ...DEMO, VERCEL: undefined, WEB_REVALIDATE_URL: "http://127.0.0.1:3100/api/revalidate" };
    expect(problems(local)).toEqual([]);
    const none = checkAppEnv({ ...DEMO, WEB_REVALIDATE_URL: undefined, WEB_REVALIDATE_SECRET: undefined });
    expect(none.ok).toBe(true);
    expect(none.warnings.join("\n")).toMatch(/5 minutos/);
  });

  it("problems never include variable values", () => {
    const secret = "valor-super-secreto-123";
    const check = checkAppEnv({ ...DEMO, NEXT_PUBLIC_SITE_URL: `http://${secret}.test`, WEB_REVALIDATE_SECRET: secret.slice(0, 9), WEB_REVALIDATE_URL: `https://${secret}.test/x` });
    expect(check.ok).toBe(false);
    expect(JSON.stringify(check)).not.toContain(secret.slice(0, 9));
  });

  it("assertEnv names the app", () => {
    expect(() => assertEnv({ ok: false, problems: ["A: falta."], warnings: [] }, "app")).toThrow("Variables de entorno de app inválidas:\n- A: falta.");
  });
});
