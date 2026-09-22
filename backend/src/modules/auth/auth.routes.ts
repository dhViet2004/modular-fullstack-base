import { Router } from "express";
import { validateBody } from "../../middleware/validate-body.middleware.js";
import { registerController } from "./password/register.controller.js";
import { registerSchema } from "./password/register.schema.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), registerController);
