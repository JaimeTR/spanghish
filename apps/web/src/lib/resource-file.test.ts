import { describe, expect, it, vi } from "vitest";
import { SIGNED_URL_SECONDS, signPublicResourceFile } from "./resource-file";

const ENV = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "a.b.c" };
const ID = "11111111-1111-4111-8111-111111111111";
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const asFetch = (mock: ReturnType<typeof vi.fn>) => mock as unknown as typeof fetch;

describe("signPublicResourceFile", () => {
  it("asks the platform for the path, then signs a short-lived download URL", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json("public/ficha colores.pdf"))
      .mockResolvedValueOnce(json({ signedURL: "/object/sign/resource-files/public/ficha%20colores.pdf?token=t" }));
    const result = await signPublicResourceFile(ID, ENV, asFetch(fetchImpl));
    expect(result).toEqual({
      ok: true,
      url: "https://x.supabase.co/storage/v1/object/sign/resource-files/public/ficha%20colores.pdf?token=t&download=",
    });

    const [rpcUrl, rpcInit] = fetchImpl.mock.calls[0]!;
    expect(rpcUrl).toBe("https://x.supabase.co/rest/v1/rpc/resource_file_path");
    expect(JSON.parse(rpcInit.body)).toEqual({ p_resource_id: ID });
    expect(rpcInit.cache).toBe("no-store");
    expect(rpcInit.next).toBeUndefined();

    const [signUrl, signInit] = fetchImpl.mock.calls[1]!;
    expect(signUrl).toBe("https://x.supabase.co/storage/v1/object/sign/resource-files/public/ficha%20colores.pdf");
    expect(JSON.parse(signInit.body)).toEqual({ expiresIn: SIGNED_URL_SECONDS });
    expect(SIGNED_URL_SECONDS).toBeLessThanOrEqual(300);
    // Solo la clave anónima: nunca una de servicio.
    expect(signInit.headers.apikey).toBe("a.b.c");
  });

  it("a restricted or missing resource is a 404 and nothing is signed", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json(null));
    expect(await signPublicResourceFile(ID, ENV, asFetch(fetchImpl))).toEqual({ ok: false, status: 404 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects a non-UUID id without any request", async () => {
    const fetchImpl = vi.fn();
    for (const id of ["1", "../x", `${ID}/..`, ""]) {
      expect(await signPublicResourceFile(id, ENV, asFetch(fetchImpl))).toEqual({ ok: false, status: 404 });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses a path that climbs out of the bucket", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json("../other-bucket/x.pdf"));
    expect(await signPublicResourceFile(ID, ENV, asFetch(fetchImpl))).toEqual({ ok: false, status: 404 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("is 503 when not configured or when the platform fails", async () => {
    expect(await signPublicResourceFile(ID, {}, asFetch(vi.fn()))).toEqual({ ok: false, status: 503 });
    expect(await signPublicResourceFile(ID, ENV, asFetch(vi.fn().mockResolvedValue(json("x", 500))))).toEqual({ ok: false, status: 503 });
    const signDown = vi.fn().mockResolvedValueOnce(json("a.pdf")).mockResolvedValueOnce(json({}, 500));
    expect(await signPublicResourceFile(ID, ENV, asFetch(signDown))).toEqual({ ok: false, status: 503 });
    const signThrows = vi.fn().mockResolvedValueOnce(json("a.pdf")).mockRejectedValueOnce(new Error("timeout"));
    expect(await signPublicResourceFile(ID, ENV, asFetch(signThrows))).toEqual({ ok: false, status: 503 });
    const odd = vi.fn().mockResolvedValueOnce(json("a.pdf")).mockResolvedValueOnce(json({ signedURL: "https://evil.example/x" }));
    expect(await signPublicResourceFile(ID, ENV, asFetch(odd))).toEqual({ ok: false, status: 503 });
  });

  it("a file the storage does not have is a 404", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json("a.pdf")).mockResolvedValueOnce(json({ error: "not found" }, 400));
    expect(await signPublicResourceFile(ID, ENV, asFetch(fetchImpl))).toEqual({ ok: false, status: 404 });
  });
});
