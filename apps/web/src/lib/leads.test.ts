import { afterEach, describe, expect, it, vi } from "vitest";
import { deliverLead, leadEmailText, leadSubject, saveLead, submitLead, type Lead } from "./leads";

const LEAD: Lead = {
  kind: "booking",
  locale: "es",
  name: "Ana López",
  email: "ana@example.com",
  phone: "",
  audience: "kids",
  place: "online",
  times: "Sábados por la mañana",
  language: "spanish",
  message: "Mi hija tiene 8 años.",
  consent: true,
};

const CONFIGURED = {
  NODE_ENV: "production",
  RESEND_API_KEY: "re_test_123",
  LEAD_TO_EMAIL: "hello@spanglish.com.au",
  LEAD_FROM_EMAIL: "Spanglish <web@spanglish.com.au>",
};

const asFetch = (fn: unknown) => fn as typeof fetch;

afterEach(() => vi.restoreAllMocks());

describe("deliverLead", () => {
  it("sends an email through the Resend REST API when configured", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () => new Response(JSON.stringify({ id: "1" }), { status: 200 }),
    );
    expect(await deliverLead(LEAD, CONFIGURED, asFetch(fetchMock))).toEqual({ ok: true, via: "email" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_123");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      from: "Spanglish <web@spanglish.com.au>",
      to: ["hello@spanglish.com.au"],
      reply_to: "ana@example.com",
      subject: "Free lesson request: Ana López",
    });
    expect(body.text).toContain("Lessons for: kids");
    expect(body.text).toContain("Mi hija tiene 8 años.");
    expect(body).not.toHaveProperty("html");
  });

  it("reports a failure (never success) when Resend answers with an error or is unreachable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = vi.fn(async () => new Response("nope", { status: 422 }));
    expect(await deliverLead(LEAD, CONFIGURED, asFetch(bad))).toEqual({ ok: false, reason: "failed" });
    const down = vi.fn(async () => {
      throw new Error("network");
    });
    expect(await deliverLead(LEAD, CONFIGURED, asFetch(down))).toEqual({ ok: false, reason: "failed" });
  });

  it("logs to the console and succeeds outside production when email is not configured", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchMock = vi.fn();
    expect(await deliverLead(LEAD, { NODE_ENV: "development" }, asFetch(fetchMock))).toEqual({ ok: true, via: "log" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledOnce();
  });

  it("is unavailable in production when email is not (fully) configured: no fake success", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn();
    const partial = { NODE_ENV: "production", RESEND_API_KEY: "re_test_123" };
    expect(await deliverLead(LEAD, partial, asFetch(fetchMock))).toEqual({ ok: false, reason: "unavailable" });
    expect(await deliverLead(LEAD, { NODE_ENV: "production" }, asFetch(fetchMock))).toEqual({ ok: false, reason: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("LEADS_LOG_ONLY=1 forces console mode (used only by the e2e production server)", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await deliverLead(LEAD, { NODE_ENV: "production", LEADS_LOG_ONLY: "1" })).toEqual({ ok: true, via: "log" });
  });
});

describe("lead email", () => {
  it("is plain text with every field and a one-line subject", () => {
    const text = leadEmailText(LEAD);
    expect(text).toContain("Phone: -");
    expect(text).toContain("Website language: es");
    expect(leadSubject({ ...LEAD, name: "A\r\nBcc: x@y.z" })).toBe("Free lesson request: A Bcc: x@y.z");
  });
});

describe("submitLead", () => {
  const booking = {
    kind: "booking" as const,
    locale: "en" as const,
    name: "Ana",
    email: "ana@example.com",
    phone: "",
    audience: "adults" as const,
    place: "online" as const,
    times: "",
    language: "spanish" as const,
    message: "",
    consent: true as const,
  };
  const platform = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_x", NODE_ENV: "production" };

  it("sin correo configurado, se guarda en el portal y cuenta como entregada", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(String(url));
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const r = await submitLead(booking, platform, fetchImpl);
    expect(r).toEqual({ ok: true, via: "platform" });
    expect(calls.some((u) => u.endsWith("/rpc/submit_lead"))).toBe(true);
  });

  it("si ni el correo ni el portal funcionan, no finge que se envió", async () => {
    const fetchImpl = (async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
    const r = await submitLead(booking, platform, fetchImpl);
    expect(r.ok).toBe(false);
  });

  it("los pedidos de la tienda no se guardan como solicitudes", async () => {
    const order = { kind: "order" as const, locale: "en" as const, email: "a@b.co", sessionId: "cs_1", items: [], totalCents: 0, currency: "aud" };
    expect(await saveLead(order, platform, (async () => new Response("{}")) as unknown as typeof fetch)).toBe(false);
  });
});
