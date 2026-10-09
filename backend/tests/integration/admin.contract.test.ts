import express, { type RequestHandler } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Auth/JWT and PostgreSQL are boundaries; real routes, guards, schemas and services run.
const fixture = vi.hoisted(() => ({
  permissions: new Set<string>(),
  superAdmin: false,
  db: {
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    role: { findUniqueOrThrow: vi.fn() },
    userRole: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: { findMany: vi.fn() },
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
import { userRouter } from "../../src/modules/users/user.routes.js";
import { auditRouter } from "../../src/modules/audit/audit.routes.js";
import { errorMiddleware } from "../../src/middleware/error.middleware.js";

const app = express();
app.use(express.json());
app.use("/api/v1/users", userRouter);
app.use("/api/v1/audit-logs", auditRouter);
app.use(errorMiddleware);
const actor = "11111111-1111-4111-8111-111111111111";
const event = (id: string) => ({
  id,
  createdAt: new Date("2026-10-09T09:00:00Z"),
  action: "AUTH_LOGIN_SUCCEEDED",
  outcome: "SUCCESS",
  actorUserId: actor,
  subjectType: null,
  subjectId: null,
  sessionId: null,
  ipAddress: null,
  userAgent: null,
  metadata: null,
});

it.each([true, false])(
  "returns only enabled=%s for role mutation, without inventing updated user fields",
  async (enabled) => {
    fixture.superAdmin = true;
    const response = await request(app)
      .patch("/api/v1/users/" + actor + "/roles/admin")
      .set("Authorization", "Bearer fixture")
      .send({ enabled });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true });
    expect((response.body as { data: unknown }).data).toEqual({ enabled });
    expect(fixture.db.userRole.upsert).toHaveBeenCalledTimes(enabled ? 1 : 0);
    expect(fixture.db.userRole.deleteMany).toHaveBeenCalledTimes(
      enabled ? 0 : 1,
    );
  },
);

it("does not mutate roles when the target user no longer exists", async () => {
  fixture.superAdmin = true;
  fixture.db.user.findUnique.mockResolvedValue(null);
  const response = await request(app)
    .patch("/api/v1/users/" + actor + "/roles/admin")
    .set("Authorization", "Bearer fixture")
    .send({ enabled: true });
  expect(response.status).toBe(404);
  expect(response.body).toMatchObject({
    success: false,
    error: { code: "USER_NOT_FOUND" },
  });
  expect(fixture.db.userRole.upsert).not.toHaveBeenCalled();
});
beforeEach(() => {
  vi.resetAllMocks();
  fixture.permissions = new Set(["users:read", "audit:read", "roles:manage"]);
  fixture.superAdmin = false;
  fixture.db.userRole.findFirst.mockImplementation(
    (query: {
      where: {
        role: { permissions: { some: { permission: { code: string } } } };
      };
    }) =>
      Promise.resolve(
        fixture.permissions.has(
          query.where.role.permissions.some.permission.code,
        )
          ? { userId: actor }
          : null,
      ),
  );
  fixture.db.userRole.findUnique.mockImplementation(() =>
    Promise.resolve(fixture.superAdmin ? { userId: actor } : null),
  );
  fixture.db.role.findUniqueOrThrow.mockResolvedValue({ id: "role-id" });
  fixture.db.user.findUnique.mockResolvedValue({ id: actor });
  fixture.db.user.findMany.mockResolvedValue([]);
  fixture.db.auditLog.findMany.mockResolvedValue([]);
});

describe("ADMIN existing HTTP contracts", () => {
  it.each(["users", "audit-logs"])(
    "requires authentication for %s",
    async (path) => {
      expect((await request(app).get("/api/v1/" + path)).status).toBe(401);
    },
  );
  it.each(["users", "audit-logs"])(
    "rejects %s when its permission is revoked",
    async (path) => {
      fixture.permissions.clear();
      const response = await request(app)
        .get("/api/v1/" + path)
        .set("Authorization", "Bearer fixture");
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: { code: "FORBIDDEN" },
      });
      expect(fixture.db.user.findMany).not.toHaveBeenCalled();
      expect(fixture.db.auditLog.findMany).not.toHaveBeenCalled();
    },
  );
  it("returns the users list fields and flattens every role assignment", async () => {
    fixture.db.user.findMany.mockResolvedValue([
      {
        id: actor,
        email: "actor@example.com",
        displayName: null,
        status: "ACTIVE",
        emailVerifiedAt: null,
        createdAt: new Date("2026-10-09T09:00:00Z"),
        updatedAt: new Date("2026-10-09T09:00:00Z"),
        roles: [{ role: { code: "MEMBER" } }, { role: { code: "ADMIN" } }],
      },
    ]);
    const response = await request(app)
      .get("/api/v1/users")
      .set("Authorization", "Bearer fixture");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        users: [
          {
            id: actor,
            roles: ["MEMBER", "ADMIN"],
            emailVerifiedAt: null,
            createdAt: "2026-10-09T09:00:00.000Z",
          },
        ],
      },
    });
    expect(fixture.db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });
  it("applies only supported audit filters and follows the backend cursor ordering", async () => {
    const ids = [
      "33333333-3333-4333-8333-333333333333",
      "22222222-2222-4222-8222-222222222222",
      "11111111-1111-4111-8111-111111111111",
    ];
    fixture.db.auditLog.findMany
      .mockResolvedValueOnce(ids.map(event))
      .mockResolvedValueOnce([event(ids[2]!)]);
    const first = await request(app)
      .get("/api/v1/audit-logs")
      .query({ action: "AUTH_LOGIN_SUCCEEDED", actorUserId: actor, limit: 2 })
      .set("Authorization", "Bearer fixture");
    expect(first.status).toBe(200);
    const body = first.body as {
      data: { auditLogs: unknown[]; nextCursor: string };
    };
    expect(body.data.auditLogs).toHaveLength(2);
    expect(body.data.nextCursor).toBeTypeOf("string");
    expect(fixture.db.auditLog.findMany).toHaveBeenLastCalledWith({
      where: { action: "AUTH_LOGIN_SUCCEEDED", actorUserId: actor },
      take: 3,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const next = await request(app)
      .get("/api/v1/audit-logs")
      .query({
        action: "AUTH_LOGIN_SUCCEEDED",
        actorUserId: actor,
        limit: 2,
        cursor: body.data.nextCursor,
      })
      .set("Authorization", "Bearer fixture");
    expect(next.status).toBe(200);
    expect(next.body).toMatchObject({ data: { nextCursor: null } });
    expect(fixture.db.auditLog.findMany).toHaveBeenLastCalledWith({
      where: {
        action: "AUTH_LOGIN_SUCCEEDED",
        actorUserId: actor,
        OR: [
          { createdAt: { lt: new Date("2026-10-09T09:00:00Z") } },
          { createdAt: new Date("2026-10-09T09:00:00Z"), id: { lt: ids[1] } },
        ],
      },
      take: 3,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  });
  it("returns an empty audit page with no fabricated cursor", async () => {
    const response = await request(app)
      .get("/api/v1/audit-logs")
      .set("Authorization", "Bearer fixture");
    expect(response.body).toMatchObject({
      success: true,
      data: { auditLogs: [], nextCursor: null },
    });
    expect(fixture.db.auditLog.findMany).toHaveBeenLastCalledWith({
      where: {},
      take: 51,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  });
  it.each([
    { limit: 0 },
    { limit: 101 },
    { limit: 1.5 },
    { actorUserId: "actor-name" },
    { action: "UNSUPPORTED" },
    { cursor: "malformed" },
  ])("rejects unsupported/invalid audit input %j", async (query) => {
    const response = await request(app)
      .get("/api/v1/audit-logs")
      .query(query)
      .set("Authorization", "Bearer fixture");
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
    expect(fixture.db.auditLog.findMany).not.toHaveBeenCalled();
  });
  it.each([
    { superAdmin: false, permission: true, status: 403 },
    { superAdmin: true, permission: false, status: 403 },
    { superAdmin: true, permission: true, status: 200 },
  ])(
    "requires both role and permission for ADMIN mutations: %j",
    async (access) => {
      fixture.superAdmin = access.superAdmin;
      if (!access.permission) fixture.permissions.delete("roles:manage");
      const response = await request(app)
        .patch("/api/v1/users/" + actor + "/roles/admin")
        .set("Authorization", "Bearer fixture")
        .send({ enabled: true });
      expect(response.status).toBe(access.status);
      expect(fixture.db.userRole.upsert).toHaveBeenCalledTimes(
        access.status === 200 ? 1 : 0,
      );
    },
  );
});
