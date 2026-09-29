import type { RequestHandler } from "express";

import { ApplicationError } from "../../core/http/application-error.js";
import { MAX_FILE_BYTES } from "./file.storage.js";

export const validateFileUpload: RequestHandler = (
  request,
  _response,
  next,
) => {
  if (request.headers["content-type"] !== "application/octet-stream") {
    next(
      new ApplicationError(
        415,
        "UNSUPPORTED_FILE_TYPE",
        "Chỉ chấp nhận application/octet-stream",
      ),
    );
    return;
  }
  if (Number(request.headers["content-length"]) > MAX_FILE_BYTES) {
    next(new ApplicationError(413, "FILE_TOO_LARGE", "Tệp vượt quá 5 MiB"));
    return;
  }
  const contentType = request.get("x-file-content-type");
  if (
    contentType &&
    (contentType.length > 100 || !/^[\w.+-]+\/[\w.+-]+$/.test(contentType))
  ) {
    next(
      new ApplicationError(
        400,
        "INVALID_CONTENT_TYPE",
        "Loại tệp không hợp lệ",
      ),
    );
    return;
  }
  next();
};
