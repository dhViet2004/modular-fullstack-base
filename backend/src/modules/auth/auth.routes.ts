import { Router } from "express";
import { validateBody } from "../../middleware/validate-body.middleware.js";
import { authController } from "./auth.controller.js";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from "./auth.schema.js";
import { authenticate } from "../../middleware/authenticate.middleware.js";
import { sessionRouter } from "../session/session.routes.js";
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

// `validateBody(schema)` cháº¡y trÆ°á»›c controller; request sai dá»¯ liá»‡u sáº½ bá»‹ tá»« chá»‘i sá»›m.
authRouter.post(
  "/register",
  validateBody(registerSchema),
  authController.register,
);
authRouter.post("/login", validateBody(loginSchema), authController.login);
authRouter.use(sessionRouter);
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
