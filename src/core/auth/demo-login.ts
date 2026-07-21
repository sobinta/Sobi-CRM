"use client";

/** Starts a server-owned demo session without exposing its credential. */
export async function signInDemoAndRedirect(
  locale: string,
): Promise<{ ok: true } | { ok: false; status?: number }> {
  const response = await fetch("/api/demo/session", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return { ok: false, status: response.status };
  window.location.assign(`/${locale}/crm`);
  return { ok: true };
}
