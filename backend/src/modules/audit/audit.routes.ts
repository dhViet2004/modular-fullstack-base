import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.middleware.js";
import { authorize } from "../../middleware/authorize.middleware.js";
import { validateQuery } from "../../middleware/validate-query.middleware.js";
import { PERMISSIONS } from "../access/permission.catalog.js";
import { listAuditLogsController } from "./audit.controller.js";
import { listAuditLogsQuerySchema } from "./audit.schema.js";

export const auditRouter = Router();

auditRouter.get(
  "/",
  authenticate,
  authorize(PERMISSIONS.AUDIT_READ),
  validateQuery(listAuditLogsQuerySchema),
  listAuditLogsController,
);
