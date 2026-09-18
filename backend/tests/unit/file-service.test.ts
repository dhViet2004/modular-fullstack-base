import { describe, expect, it, vi } from "vitest";
import { fileService } from "../../src/modules/files/file.service.js";
import { uploadService } from "../../src/modules/files/storage/upload.service.js";

describe("fileService", () => {
  it("resolves markdown MIME type from extension when browser sends application/octet-stream", async () => {
    const spy = vi.spyOn(uploadService, "upload").mockResolvedValue({ id: "file-1" } as never);
    
    await fileService.upload("user-1", {
      originalname: "readme.md",
      mimetype: "application/octet-stream",
      size: 100,
      buffer: Buffer.from("# Hello")
    } as Express.Multer.File);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "user-1",
      name: "readme.md",
      mimeType: "text/markdown"
    }));
    spy.mockRestore();
  });

  it("resolves image/jpeg for image/jpg or .jpg extension", async () => {
    const spy = vi.spyOn(uploadService, "upload").mockResolvedValue({ id: "file-2" } as never);
    
    await fileService.upload("user-1", {
      originalname: "avatar.jpg",
      mimetype: "image/jpg",
      size: 200,
      buffer: Buffer.from("jpg-data")
    } as Express.Multer.File);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "user-1",
      name: "avatar.jpg",
      mimeType: "image/jpeg"
    }));
    spy.mockRestore();
  });

  it("rejects disallowed file types like .exe or .bin", async () => {
    await expect(
      fileService.upload("user-1", {
        originalname: "program.exe",
        mimetype: "application/x-msdownload",
        size: 500,
        buffer: Buffer.from("binary")
      } as Express.Multer.File)
    ).rejects.toThrow("File type not allowed");
  });

  it("rejects files exceeding FILE_MAX_SIZE_MB", async () => {
    await expect(
      fileService.upload("user-1", {
        originalname: "large.pdf",
        mimetype: "application/pdf",
        size: 30 * 1024 * 1024,
        buffer: Buffer.alloc(0)
      } as Express.Multer.File)
    ).rejects.toThrow("File too large");
  });

  it("reuses existing file and creates logical copy", async () => {
    const { fileRepository } = await import("../../src/modules/files/file.repository.js");
    const { auditService } = await import("../../src/modules/audit/audit.service.js");

    const findSpy = vi.spyOn(fileRepository, "findOwned").mockResolvedValue({
      id: "source-id",
      name: "lesson.md",
      ownerId: "user-1",
      extension: "md"
    } as never);

    const reuseSpy = vi.spyOn(fileRepository, "reuse").mockResolvedValue({
      id: "copied-id",
      name: "lesson (Bản sao).md",
      ownerId: "user-1",
      extension: "md",
      objectId: "obj-123"
    } as never);

    const auditSpy = vi.spyOn(auditService, "record").mockResolvedValue({} as never);

    const result = await fileService.reuse("source-id", "user-1");

    expect(result.id).toBe("copied-id");
    expect(result.name).toBe("lesson (Bản sao).md");
    expect(findSpy).toHaveBeenCalledWith("source-id", "user-1");
    expect(reuseSpy).toHaveBeenCalledWith("source-id", "user-1", undefined);
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: "FILE_REUSED",
      actorUserId: "user-1",
      entityId: "copied-id"
    }));

    findSpy.mockRestore();
    reuseSpy.mockRestore();
    auditSpy.mockRestore();
  });
});

