import { describe, expect, it, vi } from "vitest";
import { checkDatabase, healthReport } from "./health";
import robots from "../app/robots";

type Result = { data: unknown; error: unknown };
const client = (result: Result | Error) => ({
  rpc: vi.fn(() => ({
    abortSignal: () => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)),
  })),
});

describe("checkDatabase", () => {
  it("returns ok when health_ping answers true", async () => {
    const c = client({ data: true, error: null });
    expect(await checkDatabase(c as never)).toBe("ok");
    expect(c.rpc).toHaveBeenCalledWith("health_ping");
  });

  it("returns unreachable when the rpc errors, throws or answers something else", async () => {
    expect(await checkDatabase(client({ data: null, error: { message: "boom" } }) as never)).toBe("unreachable");
    expect(await checkDatabase(client(new Error("timeout")) as never)).toBe("unreachable");
    expect(await checkDatabase(client({ data: null, error: null }) as never)).toBe("unreachable");
  });
});

describe("healthReport (app)", () => {
  it("reports ok with the short commit and never indexing", async () => {
    const report = await healthReport({ VERCEL_GIT_COMMIT_SHA: "0123456789abcdef" }, client({ data: true, error: null }) as never);
    expect(report).toEqual({ status: "ok", app: "app", commit: "0123456", indexing: false, db: "ok" });
  });

  it("is degraded without a database or when it does not answer", async () => {
    expect(await healthReport({}, null)).toEqual({ status: "degraded", app: "app", commit: null, indexing: false, db: "not_configured" });
    expect((await healthReport({}, client(new Error("x")) as never)).status).toBe("degraded");
  });
});

describe("app robots", () => {
  it("always disallows everything", () => {
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
});
