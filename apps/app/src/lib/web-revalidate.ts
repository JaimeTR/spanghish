export async function pingWebRevalidate(
  env: Partial<Record<string, string | undefined>> = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<"ok" | "not_configured" | "failed"> {
  const url = env.WEB_REVALIDATE_URL;
  const secret = env.WEB_REVALIDATE_SECRET;
  if (!url || !secret) return "not_configured";
  try {
    const response = await fetchImpl(url, { method: "POST", headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(3000) });
    return response.ok ? "ok" : "failed";
  } catch {
    return "failed";
  }
}
