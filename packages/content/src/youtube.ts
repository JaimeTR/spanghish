const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (ID_PATTERN.test(value)) return value;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !HOSTS.has(host)) return null;

    let id: string | null = null;
    if (host === "youtu.be") {
      id = url.pathname.slice(1);
    } else if (host.includes("youtube-nocookie.com")) {
      const match = /^\/embed\/([^/]+)$/.exec(url.pathname);
      id = match?.[1] ?? null;
    } else if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const match = /^\/(?:shorts|embed)\/([^/]+)$/.exec(url.pathname);
      id = match?.[1] ?? null;
    }
    return id !== null && ID_PATTERN.test(id) ? id : null;
  } catch {
    return null;
  }
}
