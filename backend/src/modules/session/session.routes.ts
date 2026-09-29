import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.middleware.js";
import { validateParams } from "../../middleware/validate-params.middleware.js";
import { sessionController } from "./session.controller.js";
import { sessionIdParamsSchema } from "./session.schema.js";

export const sessionRouter = Router();
sessionRouter.post("/refresh", sessionController.refresh);
sessionRouter.post("/logout", sessionController.logout);
sessionRouter.get("/me", authenticate, sessionController.me);
sessionRouter.get("/sessions", authenticate, sessionController.list);
sessionRouter.delete("/sessions/:id", authenticate, validateParams(sessionIdParamsSchema), sessionController.revoke);
