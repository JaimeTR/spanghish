import { afterEach, describe, expect, it, vi } from "vitest";
import { pingWebRevalidate } from "./web-revalidate";

afterEach(() => vi.restoreAllMocks());
describe("pingWebRevalidate", () => {
  it("pingWebRevalidate returns not_configured without env and makes no request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    expect(await pingWebRevalidate({}, fetcher)).toBe("not_configured");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("sends the bearer secret", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    expect(await pingWebRevalidate({ WEB_REVALIDATE_URL: "https://web.example/api/revalidate", WEB_REVALIDATE_SECRET: "secret" }, fetcher)).toBe("ok");
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ headers: { Authorization: "Bearer secret" }, method: "POST" });
  });
  it("returns failed on timeout without throwing", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("timeout"));
    expect(await pingWebRevalidate({ WEB_REVALIDATE_URL: "https://web.example", WEB_REVALIDATE_SECRET: "secret" }, fetcher)).toBe("failed");
  });
});
