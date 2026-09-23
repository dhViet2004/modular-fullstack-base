import { Router } from "express";
import { validateBody } from "../../middleware/validate-body.middleware.js";
import { registerController } from "./password/register.controller.js";
import { registerSchema } from "./password/register.schema.js";
import { loginController } from "./password/login.controller.js";
import { loginSchema } from "./password/login.schema.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), registerController);
authRouter.post("/login", validateBody(loginSchema), loginController);
