import { prisma } from "../../core/database/prisma.js";

export const fileRepository = {
  list: (ownerId: string) =>
    prisma.file.findMany({
      where: { ownerId, deletedAt: null },
      include: { object: true },
      orderBy: { createdAt: "desc" }
    }),

  findOwned: (id: string, ownerId: string) =>
    prisma.file.findFirst({
      where: { id, ownerId, deletedAt: null },
      include: { object: true }
    }),

  async softDelete(id: string) {
    return prisma.$transaction(async (tx) => {
      const file = await tx.file.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
      await tx.storedObject.update({
        where: { id: file.objectId },
        data: {
          referenceCount: { decrement: 1 },
          pendingDeleteAt: new Date()
        }
      });
      return file;
    });
  },

  async reuse(id: string, ownerId: string, newName?: string) {
    return prisma.$transaction(async (tx) => {
      const sourceFile = await tx.file.findFirst({
        where: { id, ownerId, deletedAt: null },
        include: { object: true }
      });

      if (!sourceFile) {
        return null;
      }

      // Tăng referenceCount cho StoredObject và xóa pendingDeleteAt (nếu đang đánh dấu dọn dẹp)
      await tx.storedObject.update({
        where: { id: sourceFile.objectId },
        data: {
          referenceCount: { increment: 1 },
          pendingDeleteAt: null
        }
      });

      const extension = sourceFile.extension || "";
      let generatedName = newName?.trim();
      if (!generatedName) {
        if (extension && sourceFile.name.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
          const baseName = sourceFile.name.slice(0, -(extension.length + 1));
          generatedName = `${baseName} (Bản sao).${extension}`;
        } else {
          generatedName = `${sourceFile.name} (Bản sao)`;
        }
      }

      const duplicatedFile = await tx.file.create({
        data: {
          objectId: sourceFile.objectId,
          ownerId,
          name: generatedName,
          extension: sourceFile.extension
        },
        include: { object: true }
      });

      return duplicatedFile;
    });
  }
};
