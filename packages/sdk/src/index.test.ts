import { describe, expect, it, vi } from "vitest";
import { SobiApiError, SobiClient } from "./index";

describe("SOBI TypeScript SDK", () => {
  it("adds bearer authentication and surfaces stable API errors", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "quota_exceeded" } }), {
        status: 429,
        headers: { "x-request-id": "req-1" },
      }),
    );
    const client = new SobiClient({
      baseUrl: "https://crm.example.test",
      apiKey: "secret",
      fetch: request,
    });
    await expect(client.contacts.list()).rejects.toEqual(
      new SobiApiError(429, "quota_exceeded", "req-1"),
    );
    expect(request.mock.calls[0][1].headers.Authorization).toBe("Bearer secret");
  });
});
