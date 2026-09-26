import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.middleware.js";
import { authorize } from "../../middleware/authorize.middleware.js";
import { assertUserIsSuperAdmin } from "../access/access.service.js";
import { PERMISSIONS } from "../access/permission.catalog.js";
import {
  listUsersController,
  setAdminRoleController,
} from "./user.controller.js";
import { validateBody } from "../../middleware/validate-body.middleware.js";
import { setAdminRoleSchema } from "./user.schema.js";

export const userRouter = Router();

userRouter.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.USERS_READ),
  listUsersController,
);

userRouter.patch(
  "/:userId/roles/admin",
  authenticate,
  authorize(PERMISSIONS.ROLES_MANAGE),
  async (request, _response, next) => {
    try {
      await assertUserIsSuperAdmin(request.auth.user.id);
      next();
    } catch (error) {
      next(error);
    }
  },
  validateBody(setAdminRoleSchema),
  setAdminRoleController,
);
