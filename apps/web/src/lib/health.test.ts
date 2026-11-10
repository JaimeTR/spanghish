import { describe, expect, it, vi } from "vitest";
import { healthReport } from "./health";

const ENV = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "a.b.c" };
const answer = (body: string, status = 200) => vi.fn().mockResolvedValue(new Response(body, { status })) as unknown as typeof fetch;

describe("healthReport (web)", () => {
  it("is ok without a platform: the web runs on its fallback", async () => {
    expect(await healthReport({})).toEqual({ status: "ok", app: "web", commit: null, indexing: true, db: "not_configured" });
  });

  it("reports db ok, the short commit and the indexing switch", async () => {
    const fetchImpl = answer("true");
    const report = await healthReport({ ...ENV, VERCEL_GIT_COMMIT_SHA: "0123456789abcdef", SITE_NOINDEX: "1" }, fetchImpl);
    expect(report).toEqual({ status: "ok", app: "web", commit: "0123456", indexing: false, db: "ok" });
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe("https://x.supabase.co/rest/v1/rpc/health_ping");
    expect(init.cache).toBe("no-store");
  });

  it("is degraded when the platform is configured but does not answer", async () => {
    expect((await healthReport(ENV, answer("boom", 500))).db).toBe("unreachable");
    expect((await healthReport(ENV, answer("boom", 500))).status).toBe("degraded");
    const broken = vi.fn().mockRejectedValue(new Error("timeout")) as unknown as typeof fetch;
    expect((await healthReport(ENV, broken)).status).toBe("degraded");
  });

  it("never echoes configuration", async () => {
    const report = await healthReport({ ...ENV, WEB_REVALIDATE_SECRET: "secreto" }, answer("true"));
    expect(JSON.stringify(report)).not.toMatch(/supabase\.co|a\.b\.c|secreto/);
  });
});
