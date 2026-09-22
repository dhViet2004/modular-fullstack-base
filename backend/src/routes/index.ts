import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";

export const apiRouter = Router();
apiRouter.get("/", (_request, response) =>
  response.json({ name: "CoreStack API", version: "v1" }),
);

apiRouter.use("/auth", authRouter);
