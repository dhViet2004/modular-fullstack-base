import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("../../../config/env.js", () => ({
  env: {
    NODE_ENV: "production",
    STORAGE_R2_ENDPOINT: "https://example.r2.cloudflarestorage.com",
    STORAGE_R2_BUCKET: "files",
    STORAGE_R2_ACCESS_KEY_ID: "test-key",
    STORAGE_R2_SECRET_ACCESS_KEY: "test-secret",
  },
}));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = send;
  },
  PutObjectCommand: class {
    constructor(public input: object) {}
  },
  GetObjectCommand: class {
    constructor(public input: object) {}
  },
  S3ServiceException: class extends Error {
    $metadata = { httpStatusCode: 404 };
  },
}));

import {
  GetObjectCommand,
  PutObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { MAX_FILE_BYTES, openFile, saveFile } from "../file.storage.js";

const userId = randomUUID();

describe("Cloudflare R2 storage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("streams a bounded upload to the user's R2 key", async () => {
    send.mockImplementation(async (command: PutObjectCommand) => {
      const body = command.input.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of body) chunks.push(chunk as Buffer);
      expect(Buffer.concat(chunks).toString()).toBe("hello");
      return {};
    });
    const file = await saveFile(userId, Readable.from([Buffer.from("hello")]));
    expect(file.size).toBe(5);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(PutObjectCommand);
    expect((send.mock.calls[0]?.[0] as PutObjectCommand).input).toMatchObject({
      Bucket: "files",
      Key: `${userId}/${file.id}`,
      ContentLength: 5,
    });
  });

  it("rejects an oversized stream before uploading", async () => {
    await expect(
      saveFile(userId, Readable.from([Buffer.alloc(MAX_FILE_BYTES + 1)])),
    ).rejects.toMatchObject({ statusCode: 413 });
    expect(send).not.toHaveBeenCalled();
  });

  it("reports R2 upload failure without returning credentials or provider details", async () => {
    send.mockRejectedValueOnce(new Error("provider details"));
    await expect(
      saveFile(userId, Readable.from([Buffer.from("hello")])),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "STORAGE_UNAVAILABLE",
    });
  });

  it("reads only the user's key and maps missing files to 404", async () => {
    send.mockResolvedValueOnce({
      Body: Readable.from([Buffer.from("hello")]),
      ContentLength: 5,
    });
    const file = await openFile(userId, randomUUID());
    expect(file.size).toBe(5);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(GetObjectCommand);

    send.mockRejectedValueOnce(
      new S3ServiceException({
        name: "NoSuchKey",
        $fault: "client",
        $metadata: { httpStatusCode: 404 },
      }),
    );
    await expect(openFile(userId, randomUUID())).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
