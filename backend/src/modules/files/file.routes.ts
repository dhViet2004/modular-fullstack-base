import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.middleware.js";
import {
  deleteFile,
  downloadFile,
  listFiles,
  updateFile,
  uploadFile,
} from "./file.controller.js";

export const fileRouter = Router();
fileRouter.post("/", authenticate, uploadFile);
fileRouter.get("/", authenticate, listFiles);
fileRouter.get("/:id", authenticate, downloadFile);
fileRouter.patch("/:id", authenticate, updateFile);
fileRouter.delete("/:id", authenticate, deleteFile);
