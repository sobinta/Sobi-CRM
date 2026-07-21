export function isSameOriginDemoRequest(
  requestUrl: string,
  origin: string | null,
  fetchSite: string | null,
): boolean {
  if (fetchSite && fetchSite !== "same-origin") return false;
  if (!origin) return fetchSite === "same-origin";

  try {
    return new URL(origin).origin === new URL(requestUrl).origin;
  } catch {
    return false;
  }
}

export function demoRequestAddress(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
