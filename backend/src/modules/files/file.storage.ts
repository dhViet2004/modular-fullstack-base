import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { finished, pipeline } from "node:stream/promises";
import {
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

import { env } from "../../config/env.js";
import { ApplicationError } from "../../core/http/application-error.js";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES_PER_USER = 10;
const storageRoot = join(process.cwd(), "storage");
let r2Client: S3Client | undefined;

function r2() {
  if (
    !env.STORAGE_R2_ENDPOINT ||
    !env.STORAGE_R2_BUCKET ||
    !env.STORAGE_R2_ACCESS_KEY_ID ||
    !env.STORAGE_R2_SECRET_ACCESS_KEY
  ) {
    throw new ApplicationError(
      503,
      "STORAGE_UNAVAILABLE",
      "Lưu trữ tệp chưa được cấu hình",
    );
  }
  r2Client ??= new S3Client({
    region: "auto",
    endpoint: env.STORAGE_R2_ENDPOINT,
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: env.STORAGE_R2_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_R2_SECRET_ACCESS_KEY,
    },
  });
  return { client: r2Client, bucket: env.STORAGE_R2_BUCKET };
}

export async function saveFile(userId: string, source: AsyncIterable<Buffer>) {
  const id = randomUUID();
  const remote = env.NODE_ENV === "production";
  const directory = remote
    ? join(tmpdir(), "corestack-uploads")
    : join(storageRoot, userId);
  const path = join(directory, id);
  let size = 0;
  let saved = false;
  await mkdir(directory, { recursive: true });

  try {
    await pipeline(
      Readable.from(source),
      new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          size += chunk.length;
          callback(
            size > MAX_FILE_BYTES
              ? new ApplicationError(
                  413,
                  "FILE_TOO_LARGE",
                  "Tệp vượt quá 5 MiB",
                )
              : null,
            chunk,
          );
        },
      }),
      createWriteStream(path, { flags: "wx" }),
    );
    if (size === 0) throw new ApplicationError(400, "EMPTY_FILE", "Tệp rỗng");
    if (remote) {
      const { client, bucket } = r2();
      const body = createReadStream(path);
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: `${userId}/${id}`,
            Body: body,
            ContentLength: size,
            ContentType: "application/octet-stream",
          }),
        );
      } catch {
        body.destroy();
        await finished(body).catch(() => undefined);
        throw new ApplicationError(
          503,
          "STORAGE_UNAVAILABLE",
          "Lưu trữ tệp tạm thời không khả dụng",
        );
      }
    }
    saved = true;
    return { id, size };
  } finally {
    if (remote || !saved) {
      await unlink(path).catch((cleanupError: NodeJS.ErrnoException) => {
        if (cleanupError.code !== "ENOENT") throw cleanupError;
      });
    }
  }
}

export async function openFile(userId: string, id: string) {
  if (env.NODE_ENV === "production") {
    const { client, bucket } = r2();
    try {
      const result = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: `${userId}/${id}` }),
      );
      if (!(result.Body instanceof Readable))
        throw new Error("Invalid R2 response stream");
      return { size: result.ContentLength, stream: result.Body };
    } catch (error) {
      if (
        error instanceof S3ServiceException &&
        error.$metadata.httpStatusCode === 404
      ) {
        throw new ApplicationError(404, "FILE_NOT_FOUND", "Không tìm thấy tệp");
      }
      throw new ApplicationError(
        503,
        "STORAGE_UNAVAILABLE",
        "Lưu trữ tệp tạm thời không khả dụng",
      );
    }
  }
  const path = join(storageRoot, userId, id);
  try {
    const file = await stat(path);
    if (!file.isFile()) throw new Error("Not a file");
    return { size: file.size, stream: createReadStream(path) };
  } catch {
    throw new ApplicationError(404, "FILE_NOT_FOUND", "Không tìm thấy tệp");
  }
}

export async function removeFile(userId: string, id: string) {
  if (env.NODE_ENV === "production") {
    const { client, bucket } = r2();
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: `${userId}/${id}` }),
    );
    return;
  }
  await unlink(join(storageRoot, userId, id)).catch(() => undefined);
}
