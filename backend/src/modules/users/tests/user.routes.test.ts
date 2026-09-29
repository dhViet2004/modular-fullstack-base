import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../middleware/authenticate.middleware.js", () => ({
  authenticate: (
    request: { auth?: unknown },
    _response: unknown,
    next: () => void,
  ) => {
    request.auth = { user: { id: "actor-1" } };
    next();
  },
}));
vi.mock("../../access/access.service.js", () => ({
  assertUserHasPermission: vi.fn().mockResolvedValue(undefined),
  assertUserIsSuperAdmin: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../user.service.js", () => ({
  userService: {
    listUsers: vi.fn().mockResolvedValue([]),
    setAdminRole: vi.fn().mockResolvedValue(undefined),
  },
}));

import { errorMiddleware } from "../../../middleware/error.middleware.js";
import { userRouter } from "../user.routes.js";
import { userService } from "../user.service.js";

describe("users routes", () => {
  it("rejects an invalid admin role path parameter", async () => {
    const app = express();
    app.use(express.json());
    app.use("/users", userRouter);
    app.use(errorMiddleware);

    const response = await request(app)
      .patch("/users//roles/admin")
      .send({ enabled: true });

    expect(response.status).toBe(404);
  });

  it("passes validated params and body to the admin role use case", async () => {
    const app = express();
    app.use(express.json());
    app.use("/users", userRouter);

    await request(app)
      .patch("/users/user-1/roles/admin")
      .send({ enabled: true });

    expect(userService.setAdminRole).toHaveBeenCalledWith("user-1", true);
  });
});
