import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { userRouter } from "../modules/users/user.routes.js";

export const apiRouter = Router();
apiRouter.get("/", (_request, response) =>
  response.json({ name: "CoreStack API", version: "v1" }),
);

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
