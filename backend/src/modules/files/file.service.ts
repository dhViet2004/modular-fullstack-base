import { extname } from "node:path";
import { ApiError } from "../../core/http/api-error.js";
import { env } from "../../config/env.js";
import { fileRepository } from "./file.repository.js";
import { uploadService } from "./storage/upload.service.js";
import { auditService } from "../audit/audit.service.js";
import { AuditAction } from "../audit/audit.constants.js";

const MIME_BY_EXT: Record<string, string> = {
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  json: "application/json",
  csv: "text/csv"
};

const allowed = new Set([
  "text/markdown",
  "text/plain",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/json",
  "text/csv"
]);

const resolveMimeType = (file: Express.Multer.File): string => {
  let mime = (file.mimetype || "").toLowerCase().trim();
  if (mime === "image/jpg" || mime === "image/pjpeg") mime = "image/jpeg";
  if (mime === "text/x-markdown") mime = "text/markdown";
  if (!mime || mime === "application/octet-stream") {
    const ext = extname(file.originalname).replace(/^\./, "").toLowerCase();
    if (ext && MIME_BY_EXT[ext]) {
      mime = MIME_BY_EXT[ext];
    }
  }
  return mime;
};

export const fileService = {
  list: fileRepository.list,
  async upload(ownerId: string, file: Express.Multer.File) {
    if (file.size > env.FILE_MAX_SIZE_MB * 1024 * 1024) {
      throw new ApiError(413, "FILE_TOO_LARGE", "File too large");
    }
    const mimeType = resolveMimeType(file);
    if (!allowed.has(mimeType)) {
      throw new ApiError(415, "FILE_TYPE_NOT_ALLOWED", "File type not allowed");
    }
    return uploadService.upload({
      ownerId,
      name: file.originalname,
      mimeType,
      buffer: file.buffer
    });
  },
  async remove(id: string, ownerId: string) {
    const file = await fileRepository.findOwned(id, ownerId);
    if (!file) throw new ApiError(404, "FILE_NOT_FOUND", "File not found");
    await fileRepository.softDelete(id);
    await auditService.record({
      actorUserId: ownerId,
      action: AuditAction.FILE_DELETED,
      entityType: "File",
      entityId: id
    });
  },
  async reuse(id: string, ownerId: string, newName?: string) {
    const source = await fileRepository.findOwned(id, ownerId);
    if (!source) throw new ApiError(404, "FILE_NOT_FOUND", "Tệp không tồn tại hoặc đã bị xóa");
    const duplicated = await fileRepository.reuse(id, ownerId, newName);
    if (!duplicated) throw new ApiError(404, "FILE_NOT_FOUND", "Không thể nhân bản tệp");
    await auditService.record({
      actorUserId: ownerId,
      action: AuditAction.FILE_REUSED,
      entityType: "File",
      entityId: duplicated.id,
      metadata: { sourceFileId: id, name: duplicated.name }
    });
    return duplicated;
  }
};
