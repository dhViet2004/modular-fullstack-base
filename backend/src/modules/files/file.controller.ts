import type { RequestHandler } from "express";

import { successResponse } from "../../core/http/api-response.js";
import { ApplicationError } from "../../core/http/application-error.js";
import { MAX_FILE_BYTES, openFile, saveFile } from "./file.storage.js";
import { prisma } from "../../core/database/prisma.js";
import { removeFile } from "./file.storage.js";

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
  const name = String(request.headers["x-file-name"] ?? file.id).slice(0, 255);
  await prisma.file.create({
    data: {
      id: file.id,
      userId: request.auth.user.id,
      name,
      size: file.size,
      contentType: "text/markdown",
    },
  });
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
  const metadata = await prisma.file.findFirst({
    where: { id, userId: request.auth.user.id },
  });
  if (!metadata)
    throw new ApplicationError(404, "FILE_NOT_FOUND", "Không tìm thấy tệp");
  const file = await openFile(request.auth.user.id, id);
  response.set({
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${metadata.name.replace(/"/g, "")}"`,
    "X-Content-Type-Options": "nosniff",
  });
  if (file.size !== undefined)
    response.set("Content-Length", file.size.toString());
  file.stream.on("error", () => response.destroy());
  file.stream.pipe(response);
};

export const listFiles: RequestHandler = async (request, response) => {
  response.json(
    successResponse(
      await prisma.file.findMany({
        where: { userId: request.auth.user.id },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          size: true,
          contentType: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ),
  );
};

export const updateFile: RequestHandler = async (request, response) => {
  const id = request.params.id;
  if (typeof id !== "string")
    throw new ApplicationError(400, "INVALID_FILE_ID", "Mã tệp không hợp lệ");
  const metadata = await prisma.file.findFirst({
    where: { id, userId: request.auth.user.id },
  });
  if (!metadata)
    throw new ApplicationError(404, "FILE_NOT_FOUND", "Không tìm thấy tệp");
  if (request.headers["content-type"] !== "application/octet-stream")
    throw new ApplicationError(
      415,
      "UNSUPPORTED_FILE_TYPE",
      "Chỉ chấp nhận application/octet-stream",
    );
  const updated = await saveFile(request.auth.user.id, request);
  const name = String(request.headers["x-file-name"] ?? metadata.name).slice(
    0,
    255,
  );
  await prisma.file.create({
    data: {
      id: updated.id,
      userId: request.auth.user.id,
      name,
      size: updated.size,
      contentType: metadata.contentType,
    },
  });
  await removeFile(request.auth.user.id, id);
  await prisma.file.delete({ where: { id } });
  response.json(successResponse({ id: updated.id, name, size: updated.size }));
};

export const deleteFile: RequestHandler = async (request, response) => {
  const id = request.params.id;
  if (typeof id !== "string")
    throw new ApplicationError(400, "INVALID_FILE_ID", "Mã tệp không hợp lệ");
  const metadata = await prisma.file.findFirst({
    where: { id, userId: request.auth.user.id },
  });
  if (!metadata)
    throw new ApplicationError(404, "FILE_NOT_FOUND", "Không tìm thấy tệp");
  await removeFile(request.auth.user.id, id);
  await prisma.file.delete({ where: { id } });
  response.status(204).send();
};
