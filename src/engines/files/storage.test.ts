import { describe, expect, it, vi } from "vitest";
import {
  createStorageProvider,
  LocalStorage,
  S3Storage,
} from "./storage";

describe("storage provider selection", () => {
  it("uses local storage by default", () => {
    expect(createStorageProvider({})).toBeInstanceOf(LocalStorage);
  });

  it("requires complete S3 configuration", () => {
    expect(() => createStorageProvider({ FILE_STORAGE_DRIVER: "s3" })).toThrow(
      "FILE_STORAGE_S3_BUCKET",
    );
  });

  it("sends private server-encrypted objects to S3", async () => {
    const send = vi.fn().mockResolvedValue({});
    const provider = createStorageProvider(
      {
        FILE_STORAGE_DRIVER: "s3",
        FILE_STORAGE_S3_BUCKET: "crm-files",
        FILE_STORAGE_S3_REGION: "eu-central-1",
      },
      { send } as never,
    );
    expect(provider).toBeInstanceOf(S3Storage);
    await provider.put("tenant/file.pdf", Buffer.from("pdf"));
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: "crm-files",
      Key: "tenant/file.pdf",
      ServerSideEncryption: "AES256",
    });
  });

  it("can omit SSE for a local S3-compatible development store", async () => {
    const send = vi.fn().mockResolvedValue({});
    const provider = createStorageProvider(
      {
        FILE_STORAGE_DRIVER: "s3",
        FILE_STORAGE_S3_BUCKET: "crm-files",
        FILE_STORAGE_S3_REGION: "eu-central-1",
        FILE_STORAGE_S3_SERVER_SIDE_ENCRYPTION: "none",
      },
      { send } as never,
    );
    await provider.put("tenant/file.pdf", Buffer.from("pdf"));
    expect(send.mock.calls[0][0].input).not.toHaveProperty(
      "ServerSideEncryption",
    );
  });
});
