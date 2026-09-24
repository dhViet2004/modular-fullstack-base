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

vi.mock("./user.service.js", () => ({
  listUsers: vi.fn(),
}));

import { errorMiddleware } from "../../middleware/error.middleware.js";
import { assertUserHasPermission } from "../access/access.service.js";
import { authenticateAccessToken } from "../auth/session/session.service.js";
import { userRouter } from "./user.routes.js";
import { listUsers } from "./user.service.js";

const authenticateAccessTokenMock = vi.mocked(authenticateAccessToken);
const assertUserHasPermissionMock = vi.mocked(assertUserHasPermission);
const listUsersMock = vi.mocked(listUsers);

const authenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "admin@example.com",
  displayName: "Admin",
  status: "ACTIVE" as const,
  emailVerifiedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Tạo app nhỏ để kiểm tra đầy đủ chuỗi authenticate -> authorize -> controller.
function createTestApp() {
  const app = express();
  app.use("/users", userRouter);
  app.use(errorMiddleware);
  return app;
}

describe("users authorization matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listUsersMock.mockResolvedValue([]);
  });

  it("returns 401 when the request has no access token", async () => {
    const response = await request(createTestApp()).get("/users");

    expect(response.status).toBe(401);
  });

  it("returns 403 when the user lacks users:read", async () => {
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
      .get("/users")
      .set("Authorization", "Bearer access-token");

    expect(response.status).toBe(403);
    expect(listUsersMock).not.toHaveBeenCalled();
  });

  it("returns 200 when the user has users:read", async () => {
    authenticateAccessTokenMock.mockResolvedValue({
      sessionId: "session-id",
      user: authenticatedUser,
    });
    assertUserHasPermissionMock.mockResolvedValue();

    const response = await request(createTestApp())
      .get("/users")
      .set("Authorization", "Bearer access-token");

    expect(response.status).toBe(200);
    expect(listUsersMock).toHaveBeenCalledTimes(1);
  });
});
