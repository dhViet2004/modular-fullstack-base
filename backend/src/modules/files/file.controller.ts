import type { RequestHandler } from "express";

import { successResponse } from "../../core/http/api-response.js";
import { ApplicationError } from "../../core/http/application-error.js";
import { MAX_FILE_BYTES, openFile, saveFile } from "./file.storage.js";

export const uploadFile: RequestHandler = async (request, response) => {
  if (request.headers["content-type"] !== "application/octet-stream") {
    throw new ApplicationError(
      415,
      "UNSUPPORTED_FILE_TYPE",
      "Chỉ chấp nhận application/octet-stream",
    );
  }
  const contentLength = Number(request.headers["content-length"]);
  if (contentLength > MAX_FILE_BYTES) {
    throw new ApplicationError(413, "FILE_TOO_LARGE", "Tệp vượt quá 5 MiB");
  }
  const file = await saveFile(request.auth.user.id, request);
  response.status(201).json(successResponse(file));
};

export const downloadFile: RequestHandler = async (request, response) => {
  const id = request.params.id;
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    throw new ApplicationError(400, "INVALID_FILE_ID", "Mã tệp không hợp lệ");
  }
  const file = await openFile(request.auth.user.id, id);
  response.set({
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${id}"`,
    "X-Content-Type-Options": "nosniff",
  });
  if (file.size !== undefined)
    response.set("Content-Length", file.size.toString());
  file.stream.on("error", () => response.destroy());
  file.stream.pipe(response);
};
