import type { RequestHandler } from "express";

import { successResponse } from "../../core/http/api-response.js";
import { fileService } from "./file.service.js";

export const uploadFile: RequestHandler = async (request, response) => {
  const file = await fileService.upload(request.auth.user.id, request, request.headers["x-file-name"]);
  response.status(201).json(successResponse(file));
};

export const downloadFile: RequestHandler = async (request, response) => {
  const file = await fileService.download(request.auth.user.id, response.locals.fileId as string);
  response.set({
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${file.name.replace(/"/g, "")}"`,
    "X-Content-Type-Options": "nosniff",
  });
  if (file.size !== undefined)
    response.set("Content-Length", file.size.toString());
  file.stream.on("error", () => response.destroy());
  file.stream.pipe(response);
};

export const listFiles: RequestHandler = async (request, response) => {
  response.json(successResponse(await fileService.list(request.auth.user.id)));
};

export const updateFile: RequestHandler = async (request, response) => {
  const updated = await fileService.update(request.auth.user.id, response.locals.fileId as string, request, request.headers["x-file-name"]);
  response.json(successResponse(updated));
};

export const deleteFile: RequestHandler = async (request, response) => {
  await fileService.remove(request.auth.user.id, response.locals.fileId as string);
  response.status(204).send();
};
