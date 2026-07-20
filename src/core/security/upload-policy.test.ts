import { describe, expect, it } from "vitest";
import {
  assertUploadEnvelope,
  UnsafeUploadError,
  validateUpload,
} from "./upload-policy";

describe("file upload policy", () => {
  it("rejects oversize and dangerous file types before buffering", () => {
    expect(() =>
      assertUploadEnvelope({
        filename: "payload.svg",
        mimeType: "image/svg+xml",
        size: 100,
      }),
    ).toThrow(UnsafeUploadError);
    expect(() =>
      assertUploadEnvelope({
        filename: "large.pdf",
        mimeType: "application/pdf",
        size: 11 * 1024 * 1024,
      }),
    ).toThrow(UnsafeUploadError);
  });

  it("rejects traversal names and mismatched MIME declarations", () => {
    expect(() =>
      assertUploadEnvelope({
        filename: "../invoice.pdf",
        mimeType: "application/pdf",
        size: 10,
      }),
    ).toThrow(UnsafeUploadError);
    expect(() =>
      assertUploadEnvelope({
        filename: "invoice.pdf",
        mimeType: "text/html",
        size: 10,
      }),
    ).toThrow(UnsafeUploadError);
  });

  it("accepts a PDF only when its bytes match the extension", () => {
    const pdf = Buffer.from("%PDF-1.7\nfixture");
    expect(
      validateUpload(
        { filename: "invoice.pdf", mimeType: "application/pdf", size: pdf.length },
        pdf,
      ),
    ).toMatchObject({ mimeType: "application/pdf" });
    expect(() =>
      validateUpload(
        { filename: "invoice.pdf", mimeType: "application/pdf", size: 5 },
        Buffer.from("hello"),
      ),
    ).toThrow(UnsafeUploadError);
  });

  it("rejects binary content disguised as text", () => {
    const binary = Buffer.from([0x61, 0x00, 0x62]);
    expect(() =>
      validateUpload(
        { filename: "notes.txt", mimeType: "text/plain", size: binary.length },
        binary,
      ),
    ).toThrow(UnsafeUploadError);
  });
});
