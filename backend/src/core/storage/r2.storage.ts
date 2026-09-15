import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig
} from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";
import type { StorageDriver } from "./storage.interface.js";

type R2Client = Pick<S3Client, "send">;

export type R2StorageOptions = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export const r2ClientConfig = (options: R2StorageOptions): S3ClientConfig => ({
  region: "auto",
  endpoint: `https://${options.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey
  }
});

const assertConfigured = (options: R2StorageOptions) => {
  const missing = Object.entries(options).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`Cloudflare R2 is not configured: missing ${missing.join(", ")}`);
};

export class R2Storage implements StorageDriver {
  private readonly client: R2Client;
  private readonly bucket: string;

  constructor(options: R2StorageOptions, client?: R2Client) {
    assertConfigured(options);
    this.bucket = options.bucket;
    this.client = client ?? new S3Client(r2ClientConfig(options));
  }

  async put(key: string, data: Buffer, mimeType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: mimeType }));
  }

  async get(key: string) {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!response.Body) throw new Error(`Cloudflare R2 returned an empty body for ${key}`);
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404) return false;
      throw error;
    }
  }
}

export const createR2Storage = () => new R2Storage({
  accountId: env.R2_ACCOUNT_ID,
  bucket: env.R2_BUCKET,
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY
});
