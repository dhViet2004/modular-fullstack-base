import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/authenticate.middleware.js";
import { assertUserIsSuperAdmin } from "../access/access.service.js";
import { successResponse } from "../../core/http/api-response.js";
import { systemService } from "./system.service.js";

const schema = z.object({ enabled: z.boolean() });
export const systemRouter = Router();
systemRouter.use(authenticate, async (request, _response, next) => {
  try { await assertUserIsSuperAdmin(request.auth.user.id); next(); } catch (error) { next(error); }
});
systemRouter.get("/email-verification", async (_request, response) => {
  response.json(successResponse({ enabled: await systemService.isEmailVerificationEnabled() }));
});
systemRouter.patch("/email-verification", async (request, response) => {
  const input = schema.parse(request.body);
  const setting = await systemService.setEmailVerificationEnabled(input.enabled);
  response.json(successResponse({ enabled: setting.emailVerificationEnabled }));
});
