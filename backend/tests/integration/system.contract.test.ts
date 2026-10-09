import express, { type RequestHandler } from "express";
import request from "supertest";
import { beforeEach, expect, it, vi } from "vitest";

// Real system routes, database role gate and service; only JWT and DB are fixtures.
const fixture = vi.hoisted(() => ({
  superAdmin: true,
  db: {
    userRole: { findUnique: vi.fn() },
    role: { findUniqueOrThrow: vi.fn() },
    systemSetting: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));
vi.mock("../../src/core/database/prisma.js", () => ({ prisma: fixture.db }));
vi.mock("../../src/middleware/authenticate.middleware.js", () => ({
  authenticate: ((req, res, next) => {
    if (!req.headers.authorization) {
      res
        .status(401)
        .json({ success: false, error: { code: "UNAUTHENTICATED" } });
      return;
    }
    req.auth = {
      user: { id: "11111111-1111-4111-8111-111111111111" },
      sessionId: "session",
    };
    next();
  }) satisfies RequestHandler,
}));
import { systemRouter } from "../../src/modules/system/system.routes.js";
import { errorMiddleware } from "../../src/middleware/error.middleware.js";
const app = express();
app.use(express.json());
app.use("/api/v1/system", systemRouter);
app.use(errorMiddleware);
const path = "/api/v1/system/email-verification";
beforeEach(() => {
  vi.resetAllMocks();
  fixture.superAdmin = true;
  fixture.db.role.findUniqueOrThrow.mockResolvedValue({
    id: "super-admin-role",
  });
  fixture.db.userRole.findUnique.mockImplementation(() =>
    Promise.resolve(fixture.superAdmin ? { userId: "actor" } : null),
  );
  fixture.db.systemSetting.findUnique.mockResolvedValue(null);
  fixture.db.systemSetting.upsert.mockImplementation(
    ({ update }: { update: { emailVerificationEnabled: boolean } }) =>
      Promise.resolve(update),
  );
});

it.each(["get", "patch"] as const)(
  "requires authentication for setting %s",
  async (method) => {
    const response = await request(app)[method](path).send({ enabled: true });
    expect(response.status).toBe(401);
    expect(fixture.db.systemSetting.findUnique).not.toHaveBeenCalled();
    expect(fixture.db.systemSetting.upsert).not.toHaveBeenCalled();
  },
);
it.each(["get", "patch"] as const)(
  "rejects setting %s without a database SUPER_ADMIN assignment",
  async (method) => {
    fixture.superAdmin = false;
    const agent = request(app);
    const response = await agent[method](path)
      .set("Authorization", "Bearer fixture")
      .send({ enabled: true });
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });
    expect(fixture.db.systemSetting.findUnique).not.toHaveBeenCalled();
    expect(fixture.db.systemSetting.upsert).not.toHaveBeenCalled();
  },
);
it.each([null, true, false])(
  "reads the boolean setting with default false for %s and no roles:manage requirement",
  async (value) => {
    fixture.db.systemSetting.findUnique.mockResolvedValue(
      value === null ? null : { emailVerificationEnabled: value },
    );
    const response = await request(app)
      .get(path)
      .set("Authorization", "Bearer fixture");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { enabled: value ?? false },
    });
    expect((response.body as { data: unknown }).data).toEqual({
      enabled: value ?? false,
    });
    expect(fixture.db.role.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { code: "SUPER_ADMIN" },
      select: { id: true },
    });
    expect(fixture.db.userRole.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_roleId: {
            userId: "11111111-1111-4111-8111-111111111111",
            roleId: "super-admin-role",
          },
        },
      }),
    );
  },
);
it.each([true, false])(
  "writes only the existing singleton boolean setting %s",
  async (enabled) => {
    const response = await request(app)
      .patch(path)
      .set("Authorization", "Bearer fixture")
      .send({ enabled });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true });
    expect((response.body as { data: unknown }).data).toEqual({ enabled });
    expect(fixture.db.systemSetting.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1, emailVerificationEnabled: enabled },
      update: { emailVerificationEnabled: enabled },
      select: { emailVerificationEnabled: true },
    });
  },
);
it.each([{}, { enabled: "true" }, { enabled: null }])(
  "preserves the existing 500 error contract for invalid setting input %j without persistence",
  async (input) => {
    const response = await request(app)
      .patch(path)
      .set("Authorization", "Bearer fixture")
      .send(input);
    // Existing inline schema errors are not mapped by the validation middleware.
    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(fixture.db.systemSetting.upsert).not.toHaveBeenCalled();
  },
);
