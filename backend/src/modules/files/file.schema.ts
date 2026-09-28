import type { RequestHandler } from "express";

import { ApplicationError } from "../../core/http/application-error.js";
import { MAX_FILE_BYTES } from "./file.storage.js";

export const validateFileUpload: RequestHandler = (request, _response, next) => {
  if (request.headers["content-type"] !== "application/octet-stream") {
    next(new ApplicationError(415, "UNSUPPORTED_FILE_TYPE", "Chỉ chấp nhận application/octet-stream"));
    return;
  }
  if (Number(request.headers["content-length"]) > MAX_FILE_BYTES) {
    next(new ApplicationError(413, "FILE_TOO_LARGE", "Tệp vượt quá 5 MiB"));
    return;
  }
  next();
};

export const validateFileId: RequestHandler = (request, response, next) => {
  const id = request.params.id;
  if (typeof id !== "string" || (request.method === "GET" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
    next(new ApplicationError(400, "INVALID_FILE_ID", "Mã tệp không hợp lệ"));
    return;
  }
  response.locals.fileId = id;
  next();
};
