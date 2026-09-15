import { describe, expect, it, vi } from "vitest";
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { R2Storage, r2ClientConfig } from "../../src/core/storage/r2.storage.js";

const options = {
  accountId: "account-id",
  bucket: "images",
  accessKeyId: "access-key",
  secretAccessKey: "secret-key"
};

describe("Cloudflare R2 storage", () => {
  it("builds the Cloudflare account endpoint and auto region", () => {
    expect(r2ClientConfig(options)).toMatchObject({
      endpoint: "https://account-id.r2.cloudflarestorage.com",
      region: "auto"
    });
  });

  it("rejects incomplete credentials", () => {
    expect(() => new R2Storage({ ...options, bucket: "" })).toThrow(/missing bucket/);
  });

  it("uploads and deletes objects in the configured bucket", async () => {
    const send = vi.fn().mockResolvedValue({});
    const storage = new R2Storage(options, { send } as never);
    await storage.put("objects/photo.jpg", Buffer.from("image"), "image/jpeg");
    await storage.delete("objects/photo.jpg");
    expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
    expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: "images", Key: "objects/photo.jpg", ContentType: "image/jpeg" });
    expect(send.mock.calls[1][0]).toBeInstanceOf(DeleteObjectCommand);
    expect(send.mock.calls[1][0].input).toMatchObject({ Bucket: "images", Key: "objects/photo.jpg" });
  });

  it("returns false only for a real not-found response", async () => {
    const missing = { send: vi.fn().mockRejectedValue({ $metadata: { httpStatusCode: 404 } }) };
    await expect(new R2Storage(options, missing as never).exists("missing.jpg")).resolves.toBe(false);
    expect(missing.send.mock.calls[0][0]).toBeInstanceOf(HeadObjectCommand);

    const unavailable = { send: vi.fn().mockRejectedValue(new Error("network unavailable")) };
    await expect(new R2Storage(options, unavailable as never).exists("photo.jpg")).rejects.toThrow("network unavailable");
  });
});
