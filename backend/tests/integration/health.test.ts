import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("GET /health", () => {
  it("returns service health without requiring the database", async () => {
    const response = await request(createApp()).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "ok", service: "api" },
    });
  });
});

describe("GET /ready", () => {
  it("returns ready when PostgreSQL is reachable", async () => {
    const response = await request(
      createApp({ checkDatabase: () => Promise.resolve() }),
    ).get("/ready");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: "ready", dependencies: { database: "up" } },
    });
  });

  it("returns 503 without exposing the database error", async () => {
    const response = await request(
      createApp({
        checkDatabase: () =>
          Promise.reject(
            new Error("postgresql://user:secret@database/internal"),
          ),
      }),
    ).get("/ready");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Dịch vụ tạm thời chưa sẵn sàng",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("secret");
  });
});
