import { Router } from "express";
import { validateBody } from "../../middleware/validate-body.middleware.js";
import { registerController } from "./password/register.controller.js";
import { registerSchema } from "./password/register.schema.js";
import { loginController } from "./password/login.controller.js";
import { loginSchema } from "./password/login.schema.js";
import { authController } from "./auth.controller.js";
import { changePasswordSchema } from "./auth.schema.js";
import { authenticate } from "../../middleware/authenticate.middleware.js";
import { validateParams } from "../../middleware/validate-params.middleware.js";
import { sessionController } from "./session/session.controller.js";
import { sessionIdParamsSchema } from "./session/session.schema.js";
import {
  requestEmailVerificationController,
  verifyEmailController,
} from "./email-verification/email-verification.controller.js";
import { verifyEmailSchema } from "./email-verification/email-verification.schema.js";
import { validateQuery } from "../../middleware/validate-query.middleware.js";
import {
  completeGoogleOAuthController,
  startGoogleOAuthController,
} from "./google/google-oauth.controller.js";
import { googleOAuthCallbackQuerySchema } from "./google/google-oauth.schema.js";

export const authRouter = Router();

// `validateBody(schema)` chạy trước controller; request sai dữ liệu sẽ bị từ chối sớm.
authRouter.post("/register", validateBody(registerSchema), registerController);
authRouter.post("/login", validateBody(loginSchema), loginController);
authRouter.post("/refresh", sessionController.refresh);
authRouter.post("/logout", sessionController.logout);
authRouter.get("/me", authenticate, sessionController.me);
authRouter.get("/sessions", authenticate, sessionController.list);
authRouter.delete("/sessions/:id", authenticate, validateParams(sessionIdParamsSchema), sessionController.revoke);
authRouter.post(
  "/password/change",
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword,
);
authRouter.post(
  "/email-verification/request",
  authenticate,
  requestEmailVerificationController,
);
authRouter.post(
  "/email-verification/verify",
  validateBody(verifyEmailSchema),
  verifyEmailController,
);
authRouter.get("/google/start", startGoogleOAuthController);
authRouter.get(
  "/google/callback",
  validateQuery(googleOAuthCallbackQuerySchema),
  completeGoogleOAuthController,
);
