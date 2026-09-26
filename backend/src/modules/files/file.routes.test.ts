import { randomUUID } from "node:crypto";
import { readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../auth/session/session.service.js", () => ({
  authenticateAccessToken: vi.fn(),
}));

import { errorMiddleware } from "../../middleware/error.middleware.js";
import { authenticateAccessToken } from "../auth/session/session.service.js";
import { fileRouter } from "./file.routes.js";
import { MAX_FILE_BYTES, saveFile } from "./file.storage.js";

const authenticateMock = vi.mocked(authenticateAccessToken);
const userId = randomUUID();
const storageDirectory = join(process.cwd(), "storage", userId);

function app() {
  const server = express();
  server.use("/files", fileRouter);
  server.use(errorMiddleware);
  return server;
}

describe("private files", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateMock.mockResolvedValue({
      sessionId: randomUUID(),
      user: {
        id: userId,
        email: "test@example.com",
        displayName: null,
        status: "ACTIVE",
        emailVerifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  it("requires authentication and keeps files private", async () => {
    expect(
      (
        await request(app())
          .post("/files")
          .set("Content-Type", "application/octet-stream")
          .send(Buffer.from("a"))
      ).status,
    ).toBe(401);

    const uploaded = await request(app())
      .post("/files")
      .set("Authorization", "Bearer test")
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("file content"));
    expect(uploaded.status).toBe(201);
    const id = (uploaded.body as { data: { id: string } }).data.id;
    try {
      const downloaded = await request(app())
        .get(`/files/${id}`)
        .set("Authorization", "Bearer test");
      expect(downloaded.status).toBe(200);
      expect(downloaded.body).toEqual(Buffer.from("file content"));
      expect(downloaded.headers["content-disposition"]).toContain("attachment");
      authenticateMock.mockResolvedValueOnce({
        sessionId: randomUUID(),
        user: {
          id: randomUUID(),
          email: "other@example.com",
          displayName: null,
          status: "ACTIVE",
          emailVerifiedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      expect(
        (
          await request(app())
            .get(`/files/${id}`)
            .set("Authorization", "Bearer test")
        ).status,
      ).toBe(404);
    } finally {
      await unlink(join(storageDirectory, id));
    }
  });

  it("rejects oversized streams before writing the excess chunk", async () => {
    await expect(
      saveFile(
        userId,
        Readable.from([Buffer.alloc(MAX_FILE_BYTES), Buffer.from("x")]),
      ),
    ).rejects.toMatchObject({
      statusCode: 413,
    });
    expect(await readdir(storageDirectory)).toEqual([]);
  });
});
