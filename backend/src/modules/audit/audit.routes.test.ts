import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../../core/http/application-error.js";

vi.mock("../auth/session/session.service.js", () => ({
  authenticateAccessToken: vi.fn(),
}));

vi.mock("../access/access.service.js", () => ({
  assertUserHasPermission: vi.fn(),
}));

vi.mock("./audit.service.js", () => ({
  listAuditLogs: vi.fn(),
}));

import { errorMiddleware } from "../../middleware/error.middleware.js";
import { assertUserHasPermission } from "../access/access.service.js";
import { authenticateAccessToken } from "../auth/session/session.service.js";
import { auditRouter } from "./audit.routes.js";
import { listAuditLogs } from "./audit.service.js";

const authenticateAccessTokenMock = vi.mocked(authenticateAccessToken);
const assertUserHasPermissionMock = vi.mocked(assertUserHasPermission);
const listAuditLogsMock = vi.mocked(listAuditLogs);

const authenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "admin@example.com",
  displayName: "Admin",
  status: "ACTIVE" as const,
  emailVerifiedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createTestApp() {
  const app = express();
  app.use("/audit-logs", auditRouter);
  app.use(errorMiddleware);
  return app;
}

describe("audit log route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAuditLogsMock.mockResolvedValue({ auditLogs: [], nextCursor: null });
  });

  it("returns 401 without an access token", async () => {
    const response = await request(createTestApp()).get("/audit-logs");
    expect(response.status).toBe(401);
  });

  it("returns 403 without audit:read", async () => {
    authenticateAccessTokenMock.mockResolvedValue({
      sessionId: "session-id",
      user: authenticatedUser,
    });
    assertUserHasPermissionMock.mockRejectedValue(
      new ApplicationError(
        403,
        "FORBIDDEN",
        "Bạn không có quyền thực hiện thao tác này",
      ),
    );

    const response = await request(createTestApp())
      .get("/audit-logs")
      .set("Authorization", "Bearer access-token");

    expect(response.status).toBe(403);
    expect(listAuditLogsMock).not.toHaveBeenCalled();
  });

  it("validates query before listing audit logs", async () => {
    authenticateAccessTokenMock.mockResolvedValue({
      sessionId: "session-id",
      user: authenticatedUser,
    });
    assertUserHasPermissionMock.mockResolvedValue();

    const response = await request(createTestApp())
      .get("/audit-logs?limit=101")
      .set("Authorization", "Bearer access-token");

    expect(response.status).toBe(400);
    expect(listAuditLogsMock).not.toHaveBeenCalled();
  });

  it("returns a page for an authorized admin", async () => {
    authenticateAccessTokenMock.mockResolvedValue({
      sessionId: "session-id",
      user: authenticatedUser,
    });
    assertUserHasPermissionMock.mockResolvedValue();

    const response = await request(createTestApp())
      .get("/audit-logs?limit=25&action=AUTH_LOGIN_FAILED")
      .set("Authorization", "Bearer access-token");

    expect(response.status).toBe(200);
    expect(listAuditLogsMock).toHaveBeenCalledWith({
      limit: 25,
      action: "AUTH_LOGIN_FAILED",
    });
  });
});
