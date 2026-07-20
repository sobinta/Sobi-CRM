import { lookup as dnsLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";

const blockedIpv4 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedIpv4.addSubnet(network, prefix, "ipv4");
}

const blockedIpv6 = new BlockList();
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b:1::", 48],
  ["2001::", 32],
  ["2001:10::", 28],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedIpv6.addSubnet(network, prefix, "ipv6");
}

const globalIpv6 = new BlockList();
globalIpv6.addSubnet("2000::", 3, "ipv6");

export class UnsafeOutboundUrlError extends Error {
  constructor(message = "Outbound URL is not allowed.") {
    super(message);
    this.name = "UnsafeOutboundUrlError";
  }
}

export function isPublicNetworkAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blockedIpv4.check(address, "ipv4");
  if (family === 6) {
    return (
      globalIpv6.check(address, "ipv6") &&
      !blockedIpv6.check(address, "ipv6")
    );
  }
  return false;
}

type LookupResult = { address: string; family: 4 | 6 };
type LookupAll = (
  hostname: string,
) => Promise<ReadonlyArray<LookupResult>>;

const lookupAll: LookupAll = async (hostname) => {
  const rows = await dnsLookup(hostname, { all: true, verbatim: true });
  return rows.map(({ address, family }) => ({
    address,
    family: family as 4 | 6,
  }));
};

export interface ResolvedOutboundUrl {
  url: URL;
  address: string;
  family: 4 | 6;
}

export async function resolveOutboundUrl(
  raw: string,
  resolver: LookupAll = lookupAll,
): Promise<ResolvedOutboundUrl> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeOutboundUrlError();
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new UnsafeOutboundUrlError("Only HTTP(S) webhook URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new UnsafeOutboundUrlError("Webhook URLs cannot contain credentials.");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new UnsafeOutboundUrlError("Production webhooks require HTTPS.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const literalFamily = isIP(hostname);
  const addresses: ReadonlyArray<LookupResult> = literalFamily
    ? [{ address: hostname, family: literalFamily as 4 | 6 }]
    : await resolver(hostname);
  if (addresses.length === 0) throw new UnsafeOutboundUrlError();

  const allowPrivate =
    process.env.NODE_ENV !== "production" &&
    process.env.WEBHOOK_ALLOW_PRIVATE_NETWORKS === "true";
  if (!allowPrivate && addresses.some(({ address }) => !isPublicNetworkAddress(address))) {
    throw new UnsafeOutboundUrlError();
  }

  // Pin one address after validating every answer. Rejecting mixed public and
  // private answers prevents round-robin DNS from becoming an SSRF bypass.
  return { url, ...addresses[0] };
}

export interface WebhookPostResult {
  status: number;
  ok: boolean;
}

/** POST using the already-validated address while retaining hostname TLS/SNI. */
export async function postWebhook(
  rawUrl: string,
  body: string,
  headers: Record<string, string>,
  timeoutMs = 5_000,
): Promise<WebhookPostResult> {
  const target = await resolveOutboundUrl(rawUrl);
  const transport = target.url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.request(
      {
        protocol: target.url.protocol,
        hostname: target.url.hostname,
        port: target.url.port || undefined,
        path: `${target.url.pathname}${target.url.search}`,
        method: "POST",
        headers: {
          ...headers,
          "Content-Length": String(Buffer.byteLength(body)),
        },
        lookup: (_hostname, _options, callback) => {
          callback(null, target.address, target.family);
        },
        servername: isIP(target.url.hostname.replace(/^\[|\]$/g, ""))
          ? undefined
          : target.url.hostname,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        response.resume();
        response.once("end", () =>
          resolve({ status, ok: status >= 200 && status < 300 }),
        );
      },
    );
    request.setTimeout(timeoutMs, () =>
      request.destroy(new Error("Webhook request timed out.")),
    );
    request.once("error", reject);
    request.end(body);
  });
}
