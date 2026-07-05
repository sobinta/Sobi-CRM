import crypto from "node:crypto";

/**
 * Field-level encryption (AES-256-GCM) for sensitive data at rest — e.g.
 * applicant income, national IDs. The key comes from FIELD_ENCRYPTION_KEY
 * (32 bytes, base64). Output is a self-describing string: iv.tag.ciphertext
 * (all base64), so a single column round-trips without extra schema.
 */

const ALGO = "aes-256-gcm";

function getKey(): Buffer | null {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}

/** Encrypt a string. Returns null input unchanged; throws if no key set. */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null;
  const key = getKey();
  if (!key) {
    throw new Error("FIELD_ENCRYPTION_KEY is not configured.");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

/** Decrypt a value produced by encryptField. Returns null on missing input. */
export function decryptField(value: string | null | undefined): string | null {
  if (value == null) return null;
  const key = getKey();
  if (!key) throw new Error("FIELD_ENCRYPTION_KEY is not configured.");
  const [ivB64, tagB64, ctB64] = value.split(".");
  if (!ivB64 || !tagB64 || !ctB64) return null;
  const decipher = crypto.createDecipheriv(
    ALGO,
    key,
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return pt.toString("utf8");
}

/** Whether field encryption is available (a key is configured). */
export function encryptionAvailable(): boolean {
  return getKey() !== null;
}
