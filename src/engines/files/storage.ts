import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

/** Files are private and are only returned by the permission-checked route. */
export interface StorageProvider {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export class LocalStorage implements StorageProvider {
  private readonly root: string;
  constructor(root = process.env.FILE_STORAGE_LOCAL_PATH ?? "./storage") {
    this.root = path.resolve(
      /* turbopackIgnore: true */
      root,
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
    const target = this.full(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);
  }
  async get(key: string) {
    return fs.readFile(this.full(key));
  }
  async delete(key: string) {
    await fs.rm(this.full(key), { force: true });
  }
}

type S3Sender = Pick<S3Client, "send">;

export class S3Storage implements StorageProvider {
  constructor(
    private readonly bucket: string,
    private readonly client: S3Sender,
  ) {}

  async put(key: string, data: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ServerSideEncryption: "AES256",
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!result.Body) throw new Error("Stored object has no body.");
    return Buffer.from(await result.Body.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}

type StorageEnvironment = Readonly<Record<string, string | undefined>>;

function s3Config(env: StorageEnvironment): S3ClientConfig {
  const region = env.FILE_STORAGE_S3_REGION;
  if (!region) throw new Error("FILE_STORAGE_S3_REGION is required.");
  const config: S3ClientConfig = {
    region,
    endpoint: env.FILE_STORAGE_S3_ENDPOINT || undefined,
    forcePathStyle: env.FILE_STORAGE_S3_FORCE_PATH_STYLE === "true",
  };
  const accessKeyId = env.FILE_STORAGE_S3_ACCESS_KEY_ID;
  const secretAccessKey = env.FILE_STORAGE_S3_SECRET_ACCESS_KEY;
  if (accessKeyId || secretAccessKey) {
    if (!accessKeyId || !secretAccessKey) {
      throw new Error("Both S3 access key and secret key are required together.");
    }
    config.credentials = { accessKeyId, secretAccessKey };
  }
  return config;
}

export function createStorageProvider(
  env: StorageEnvironment = process.env,
  client?: S3Sender,
): StorageProvider {
  const driver = env.FILE_STORAGE_DRIVER ?? "local";
  if (driver === "local") {
    return new LocalStorage(env.FILE_STORAGE_LOCAL_PATH ?? "./storage");
  }
  if (driver !== "s3") throw new Error(`Unsupported file storage driver: ${driver}`);
  const bucket = env.FILE_STORAGE_S3_BUCKET;
  if (!bucket) throw new Error("FILE_STORAGE_S3_BUCKET is required.");
  return new S3Storage(bucket, client ?? new S3Client(s3Config(env)));
}

let selectedStorage: StorageProvider | undefined;
function provider(): StorageProvider {
  selectedStorage ??= createStorageProvider();
  return selectedStorage;
}

/** Lazy proxy avoids connecting to external infrastructure during build. */
export const storage: StorageProvider = {
  put: (key, data) => provider().put(key, data),
  get: (key) => provider().get(key),
  delete: (key) => provider().delete(key),
};

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
