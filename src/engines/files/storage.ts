import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Storage provider abstraction. Local disk in dev; the interface matches an
 * S3-compatible object store so a cloud provider drops in without touching
 * callers. Files are never served from a public path — only via the signed,
 * permission-checked download route.
 */

export interface StorageProvider {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

class LocalStorage implements StorageProvider {
  private root: string;
  constructor() {
    this.root = path.resolve(
      /* turbopackIgnore: true */
      process.env.FILE_STORAGE_LOCAL_PATH ?? "./storage",
    );
  }
  private full(key: string) {
    const candidate = path.resolve(this.root, key);
    if (candidate !== this.root && !candidate.startsWith(`${this.root}${path.sep}`)) {
      throw new Error("Storage key escapes the configured root.");
    }
    return candidate;
  }
  async put(key: string, data: Buffer) {
    const p = this.full(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, data);
  }
  async get(key: string) {
    return fs.readFile(this.full(key));
  }
  async delete(key: string) {
    await fs.rm(this.full(key), { force: true });
  }
}

export const storage: StorageProvider = new LocalStorage();

/** Build a tenant-scoped storage key. */
export function makeStorageKey(tenantId: string, filename: string): string {
  const id = crypto.randomBytes(8).toString("hex");
  const safe = filename.replace(/[^\w.\-]/g, "_");
  return `${tenantId}/${id}-${safe}`;
}

/** Sign a file id for time-limited download links. */
export function signFileToken(fileId: string, ttlMs = 5 * 60_000): string {
  const secret = signingSecret();
  const exp = Date.now() + ttlMs;
  const payload = `${fileId}.${exp}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${exp}.${sig}`;
}

export function verifyFileToken(fileId: string, token: string): boolean {
  const secret = signingSecret();
  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;
  if (Number(expStr) < Date.now()) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${fileId}.${expStr}`)
    .digest("hex");
  const actualBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function signingSecret(): string {
  const secret = process.env.FILE_SIGNING_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FILE_SIGNING_SECRET must contain at least 32 characters.");
  }
  return "local-development-file-signing-secret";
}
