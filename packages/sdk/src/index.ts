export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  lifecycle: string;
  createdAt: string;
}

export interface CreateContactInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  lifecycle?: string;
  source?: string | null;
}

export class SobiApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(`SOBI API error: ${code}`);
    this.name = "SobiApiError";
  }
}

type Fetch = typeof fetch;

export class SobiClient {
  readonly contacts = {
    list: (options: { cursor?: string; limit?: number } = {}) => {
      const query = new URLSearchParams();
      if (options.cursor) query.set("cursor", options.cursor);
      if (options.limit) query.set("limit", String(options.limit));
      return this.request<{
        data: Contact[];
        meta: { requestId: string; nextCursor: string | null };
      }>(`/api/v1/public/contacts?${query}`);
    },
    create: (input: CreateContactInput) =>
      this.request<{ data: Contact; meta: { requestId: string } }>(
        "/api/v1/public/contacts",
        { method: "POST", body: JSON.stringify(input) },
      ),
  };

  constructor(
    private readonly options: {
      baseUrl: string;
      apiKey: string;
      fetch?: Fetch;
    },
  ) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const request = this.options.fetch ?? globalThis.fetch;
    const response = await request(new URL(path, this.options.baseUrl), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.apiKey}`,
        ...init.headers,
      },
    });
    const payload = await response.json() as {
      error?: { code?: string };
    } & T;
    if (!response.ok) {
      throw new SobiApiError(
        response.status,
        payload.error?.code ?? "unknown_error",
        response.headers.get("x-request-id") ?? undefined,
      );
    }
    return payload;
  }
}
