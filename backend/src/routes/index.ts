import { Router } from "express";

export const apiRouter = Router();
apiRouter.get("/", (_request, response) =>
  response.json({ name: "CoreStack API", version: "v1" }),
);
