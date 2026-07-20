import path from "node:path";

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

function configuredMaxBytes(): number {
  const parsed = Number(process.env.FILE_UPLOAD_MAX_BYTES ?? DEFAULT_MAX_BYTES);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, 50 * 1024 * 1024)
    : DEFAULT_MAX_BYTES;
}

export class UnsafeUploadError extends Error {
  constructor(message = "File upload is not allowed.") {
    super(message);
    this.name = "UnsafeUploadError";
  }
}

export interface UploadEnvelope {
  filename: string;
  mimeType: string;
  size: number;
}

export interface ValidatedUpload {
  filename: string;
  mimeType: string;
  size: number;
}

const MIME_BY_EXTENSION: Record<string, readonly string[]> = {
  ".pdf": ["application/pdf", "application/octet-stream"],
  ".png": ["image/png", "application/octet-stream"],
  ".jpg": ["image/jpeg", "application/octet-stream"],
  ".jpeg": ["image/jpeg", "application/octet-stream"],
  ".webp": ["image/webp", "application/octet-stream"],
  ".txt": ["text/plain"],
  ".csv": ["text/csv", "application/csv", "text/plain"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
  ],
};

const CANONICAL_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function safeFilename(filename: string): string {
  const trimmed = filename.trim();
  if (
    !trimmed ||
    trimmed.length > 180 ||
    path.basename(trimmed) !== trimmed ||
    /[\u0000-\u001f\u007f]/.test(trimmed)
  ) {
    throw new UnsafeUploadError();
  }
  return trimmed;
}

export function assertUploadEnvelope(input: UploadEnvelope): ValidatedUpload {
  const filename = safeFilename(input.filename);
  if (!Number.isSafeInteger(input.size) || input.size <= 0 || input.size > configuredMaxBytes()) {
    throw new UnsafeUploadError();
  }
  const extension = path.extname(filename).toLowerCase();
  const allowedMimes = MIME_BY_EXTENSION[extension];
  const mimeType = input.mimeType.toLowerCase().split(";", 1)[0].trim();
  if (!allowedMimes || !allowedMimes.includes(mimeType)) {
    throw new UnsafeUploadError();
  }
  return {
    filename,
    mimeType: CANONICAL_MIME[extension],
    size: input.size,
  };
}

function startsWith(data: Buffer, signature: readonly number[]): boolean {
  return signature.every((byte, index) => data[index] === byte);
}

function isUtf8Text(data: Buffer): boolean {
  if (data.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(data.subarray(0, 64 * 1024));
    return true;
  } catch {
    return false;
  }
}

export function validateUpload(
  input: UploadEnvelope,
  data: Buffer,
): ValidatedUpload {
  const validated = assertUploadEnvelope(input);
  if (data.length !== input.size) throw new UnsafeUploadError();
  const extension = path.extname(validated.filename).toLowerCase();

  const signatureMatches =
    extension === ".pdf"
      ? startsWith(data, [0x25, 0x50, 0x44, 0x46, 0x2d])
      : extension === ".png"
        ? startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        : extension === ".jpg" || extension === ".jpeg"
          ? startsWith(data, [0xff, 0xd8, 0xff])
          : extension === ".webp"
            ? startsWith(data, [0x52, 0x49, 0x46, 0x46]) &&
              data.subarray(8, 12).toString("ascii") === "WEBP"
            : extension === ".txt" || extension === ".csv"
              ? isUtf8Text(data)
              : extension === ".docx" || extension === ".xlsx"
                ? startsWith(data, [0x50, 0x4b, 0x03, 0x04]) &&
                  data.includes(Buffer.from("[Content_Types].xml")) &&
                  data.includes(Buffer.from(extension === ".docx" ? "word/" : "xl/"))
                : false;

  if (!signatureMatches) throw new UnsafeUploadError();
  return validated;
}
