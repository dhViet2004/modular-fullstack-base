import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.middleware.js";
import { authorize } from "../../middleware/authorize.middleware.js";
import { PERMISSIONS } from "../access/permission.catalog.js";
import { listUsersController } from "./user.controller.js";

export const userRouter = Router();

userRouter.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.USERS_READ),
  listUsersController,
);
