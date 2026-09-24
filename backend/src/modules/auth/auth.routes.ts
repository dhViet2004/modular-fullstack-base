import { Router } from "express";
import { validateBody } from "../../middleware/validate-body.middleware.js";
import { registerController } from "./password/register.controller.js";
import { registerSchema } from "./password/register.schema.js";
import { loginController } from "./password/login.controller.js";
import { loginSchema } from "./password/login.schema.js";
import { authenticate } from "../../middleware/authenticate.middleware.js";
import { logoutController } from "./session/logout.controller.js";
import { meController } from "./session/me.controller.js";
import { refreshController } from "./session/refresh.controller.js";

export const authRouter = Router();

// `validateBody(schema)` chạy trước controller; request sai dữ liệu sẽ bị từ chối sớm.
authRouter.post("/register", validateBody(registerSchema), registerController);
authRouter.post("/login", validateBody(loginSchema), loginController);
authRouter.post("/refresh", refreshController);
authRouter.post("/logout", logoutController);
authRouter.get("/me", authenticate, meController);
