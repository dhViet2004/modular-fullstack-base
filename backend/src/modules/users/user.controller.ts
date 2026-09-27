import type { RequestHandler } from "express";

import { successResponse } from "../../core/http/api-response.js";
import { listUsers, setAdminRole } from "./user.service.js";

// Trả danh sách user cho actor đã vượt qua middleware authenticate và authorize.
export const listUsersController: RequestHandler = async (
  _request,
  response,
) => {
  const users = await listUsers();

  response.json(
    successResponse({
      users: users.map((user) => ({
        ...user,
        roles: user.roles.map((assignment) => assignment.role.code),
      })),
    }),
  );
};

export const setAdminRoleController: RequestHandler = async (
  request,
  response,
) => {
  const { enabled } = request.body as { enabled: boolean };
  const { userId } = response.locals.validatedParams as { userId: string };
  await setAdminRole(userId, enabled);
  response.json(successResponse({ enabled }));
};
