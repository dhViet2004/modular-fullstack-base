import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.middleware.js";
import { downloadFile, uploadFile } from "./file.controller.js";

export const fileRouter = Router();
fileRouter.post("/", authenticate, uploadFile);
fileRouter.get("/:id", authenticate, downloadFile);
