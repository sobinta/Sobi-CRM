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
    this.root = process.env.FILE_STORAGE_LOCAL_PATH ?? "./storage";
  }
  private full(key: string) {
    // Prevent path traversal.
    const safe = key.replace(/\.\./g, "").replace(/^\/+/, "");
    return path.join(this.root, safe);
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
  const secret = process.env.FILE_SIGNING_SECRET ?? "dev";
  const exp = Date.now() + ttlMs;
  const payload = `${fileId}.${exp}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${exp}.${sig}`;
}

export function verifyFileToken(fileId: string, token: string): boolean {
  const secret = process.env.FILE_SIGNING_SECRET ?? "dev";
  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;
  if (Number(expStr) < Date.now()) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${fileId}.${expStr}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
