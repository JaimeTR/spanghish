import { describe, expect, it, vi } from "vitest";
import { contentMediaUrl, getRpc, supabaseHeaders, WEB_CONTENT_TAG } from "./platform";

const ENV = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co/", NEXT_PUBLIC_SUPABASE_ANON_KEY: "a.b.c" };

describe("platform client", () => {
  it("returns not_configured and makes no request without env", async () => {
    const fetchImpl = vi.fn();
    expect(await getRpc("list_published_teachers", {}, {}, fetchImpl as unknown as typeof fetch)).toEqual({
      ok: false,
      reason: "not_configured",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts to the RPC with the cache tag and returns the data", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ slug: "a" }]), { status: 200 }));
    const result = await getRpc("list_published_teachers", {}, ENV, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, data: [{ slug: "a" }] });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://x.supabase.co/rest/v1/rpc/list_published_teachers");
    expect(init.method).toBe("POST");
    expect(init.next).toMatchObject({ revalidate: 300, tags: [WEB_CONTENT_TAG] });
  });

  it("maps a 500 and a network error to failed", async () => {
    const down = vi.fn().mockResolvedValue(new Response("boom", { status: 500 }));
    expect(await getRpc("f", {}, ENV, down as unknown as typeof fetch)).toEqual({ ok: false, reason: "failed" });
    const broken = vi.fn().mockRejectedValue(new Error("timeout"));
    expect(await getRpc("f", {}, ENV, broken as unknown as typeof fetch)).toEqual({ ok: false, reason: "failed" });
  });

  it("sends Bearer only for JWT keys", () => {
    expect(supabaseHeaders("a.b.c").Authorization).toBe("Bearer a.b.c");
    expect(supabaseHeaders("sb_publishable_abc").Authorization).toBeUndefined();
    expect(supabaseHeaders("sb_publishable_abc").apikey).toBe("sb_publishable_abc");
  });

  it("builds the public media URL or null", () => {
    expect(contentMediaUrl("teachers/x.webp", ENV)).toBe("https://x.supabase.co/storage/v1/object/public/content-media/teachers/x.webp");
    expect(contentMediaUrl(null, ENV)).toBeNull();
    expect(contentMediaUrl("teachers/x.webp", {})).toBeNull();
  });
});
