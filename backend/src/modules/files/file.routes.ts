import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.middleware.js";
import { validateParams } from "../../middleware/validate-params.middleware.js";
import { fileIdParamsSchema } from "./file.schema.js";
import { validateFileUpload } from "./file.middleware.js";
import {
  deleteFile,
  downloadFile,
  listFiles,
  updateFile,
  uploadFile,
} from "./file.controller.js";

export const fileRouter = Router();
fileRouter.post("/", authenticate, validateFileUpload, uploadFile);
fileRouter.get("/", authenticate, listFiles);
fileRouter.get("/:id", authenticate, validateParams(fileIdParamsSchema), downloadFile);
fileRouter.patch("/:id", authenticate, validateParams(fileIdParamsSchema), validateFileUpload, updateFile);
fileRouter.delete("/:id", authenticate, validateParams(fileIdParamsSchema), deleteFile);
