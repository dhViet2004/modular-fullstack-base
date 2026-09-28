import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.middleware.js";
import { validateFileId, validateFileUpload } from "./file.schema.js";
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
fileRouter.get("/:id", authenticate, validateFileId, downloadFile);
fileRouter.patch("/:id", authenticate, validateFileId, validateFileUpload, updateFile);
fileRouter.delete("/:id", authenticate, validateFileId, deleteFile);
